#!/usr/bin/env python3
"""Standalone NXS training engine for Colab/Kaggle. The web app does not train models."""
from __future__ import annotations
import argparse, hashlib, json, math, random, struct, time
from datetime import datetime, timezone
from pathlib import Path

MODALITIES = {1:"think", 2:"forge", 3:"cyber", 4:"mcp", 5:"vision"}

def unescape(data: bytes) -> bytes:
    out=bytearray(); i=0
    while i<len(data):
        if data[i]==255:
            if i+1>=len(data) or data[i+1]!=255:
                raise ValueError("Octet FF non échappé dans une charge utile NXS.")
            out.append(255); i+=2
        else:
            out.append(data[i]); i+=1
    return bytes(out)

def parse_nxs(data: bytes):
    if not data: raise ValueError("Le fichier NXS est vide.")
    result=[]; offset=0
    while offset<len(data):
        if offset+4>len(data): raise ValueError("En-tête de longueur NXS tronqué.")
        length=struct.unpack_from("<I",data,offset)[0]; offset+=4
        if length<4 or length>len(data)-offset: raise ValueError("Longueur de séquence NXS invalide ou tronquée.")
        raw=data[offset:offset+length]; offset+=length
        if raw[:2]!=b"\xff\xfe" or raw[-2:]!=b"\xff\x00": raise ValueError("Séquence NXS sans marqueur BOS/EOS valide.")
        segments=[]; active=None; start=2; cursor=2; end=len(raw)-2
        while cursor<end:
            if raw[cursor]!=255: cursor+=1; continue
            if cursor+1<end and raw[cursor+1]==255: cursor+=2; continue
            if cursor+1>=end: raise ValueError("Marqueur de modalité NXS tronqué.")
            marker=raw[cursor+1]
            if marker not in MODALITIES: raise ValueError("Marqueur NXS inconnu: FF %02X." % marker)
            if active is not None: segments.append({"modality":active,"data":unescape(raw[start:cursor])})
            active=MODALITIES[marker]; cursor+=2; start=cursor
        if active is None: raise ValueError("Aucun segment de modalité dans la séquence.")
        segments.append({"modality":active,"data":unescape(raw[start:end])})
        result.append({"raw":raw,"segments":segments})
    if not result: raise ValueError("Aucune séquence NXS exploitable.")
    return result

def extract_text_records(sequences):
    records=[]
    for sequence in sequences:
        parts=[]
        for segment in sequence["segments"]:
            modality=segment["modality"]; payload=segment["data"]
            if modality=="vision": continue
            if modality=="cyber":
                if not payload: continue
                ratio=sum(chr(b).isprintable() or chr(b).isspace() for b in payload)/len(payload)
                if ratio<0.88: continue
            try: value=payload.decode("utf-8","strict").strip()
            except UnicodeDecodeError: continue
            if value: parts.append("["+modality.upper()+"]\n"+value)
        if parts: records.append("\n\n".join(parts))
    return records

class ByteWindowDataset:
    def __init__(self,sequences,block_size):
        self.samples=[]
        for sequence in sequences:
            raw=sequence["raw"]
            for start in range(0,max(1,len(raw)-1),block_size):
                chunk=list(raw[start:start+block_size+1])
                if len(chunk)<2: continue
                x=chunk[:-1]; y=chunk[1:]; pad=block_size-len(x)
                if pad>0: x += [0]*pad; y += [-100]*pad
                self.samples.append((x,y))
        if not self.samples: raise ValueError("Pas assez d’octets pour former des fenêtres.")
    def __len__(self): return len(self.samples)
    def __getitem__(self,index):
        import torch
        x,y=self.samples[index]
        return torch.tensor(x,dtype=torch.long),torch.tensor(y,dtype=torch.long)

def split_items(items):
    if not items: raise ValueError("Aucune donnée exploitable.")
    values=list(items); random.Random(42).shuffle(values)
    if len(values)==1: return values,values,True
    cut=max(1,min(len(values)-1,int(len(values)*0.9)))
    return values[:cut],values[cut:],False

def train_a(args,sequences,out):
    import torch
    from torch.utils.data import Dataset
    from transformers import AutoTokenizer,AutoModelForCausalLM,Trainer,TrainingArguments,DataCollatorForLanguageModeling
    from peft import LoraConfig,TaskType,get_peft_model
    texts=extract_text_records(sequences)
    if not texts: raise ValueError("Mode A: aucun segment textuel exploitable.")
    train_text,val_text,fallback=split_items(texts)
    tokenizer=AutoTokenizer.from_pretrained(args.model_name,use_fast=True)
    if tokenizer.pad_token is None: tokenizer.pad_token=tokenizer.eos_token
    class TextBlocks(Dataset):
        def __init__(self,records):
            self.rows=[]
            for text in records:
                ids=tokenizer(text,add_special_tokens=True,truncation=False)["input_ids"]
                for start in range(0,max(1,len(ids)-1),args.block_size):
                    chunk=ids[start:start+args.block_size]
                    if len(chunk)>=2: self.rows.append({"input_ids":chunk})
            if not self.rows: raise ValueError("Aucun bloc de texte produit par le tokenizer.")
        def __len__(self): return len(self.rows)
        def __getitem__(self,i): return self.rows[i]
    train_ds,val_ds=TextBlocks(train_text),TextBlocks(val_text)
    model=AutoModelForCausalLM.from_pretrained(args.model_name,torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32)
    model.config.use_cache=False
    model=get_peft_model(model,LoraConfig(task_type=TaskType.CAUSAL_LM,r=8,lora_alpha=16,lora_dropout=0.05,
        target_modules=["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"]))
    settings=TrainingArguments(output_dir=str(out/"checkpoints"),num_train_epochs=args.epochs,
        per_device_train_batch_size=max(1,min(args.batch_size,4)),per_device_eval_batch_size=1,
        learning_rate=args.learning_rate,eval_strategy="epoch",save_strategy="epoch",logging_steps=10,
        save_total_limit=2,fp16=torch.cuda.is_available(),gradient_checkpointing=True,report_to="none")
    trainer=Trainer(model=model,args=settings,train_dataset=train_ds,eval_dataset=val_ds,
        data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer,mlm=False),tokenizer=tokenizer)
    trained=trainer.train(); evaluated=trainer.evaluate()
    artifact=out/"adapter"; trainer.model.save_pretrained(artifact); tokenizer.save_pretrained(artifact)
    metrics={"trainLoss":float(trained.training_loss),"validationLoss":float(evaluated.get("eval_loss",math.nan)),
        "trainSteps":int(trained.global_step),"textRecordCount":len(texts),
        "trainBlockCount":len(train_ds),"validationBlockCount":len(val_ds)}
    return metrics,artifact,"cuda" if torch.cuda.is_available() else "cpu",len(train_ds),len(val_ds),fallback

def train_bc(args,sequences,out):
    import torch
    from torch import nn
    from torch.nn import functional as F
    from torch.utils.data import DataLoader
    if args.d_model%args.heads: raise ValueError("--d_model doit être divisible par --heads.")
    train_seq,val_seq,fallback=split_items(sequences)
    train_ds=ByteWindowDataset(train_seq,args.block_size); val_ds=ByteWindowDataset(val_seq,args.block_size)
    device=torch.device("cuda" if torch.cuda.is_available() else "cpu")
    class CustomBlock(nn.Module):
        def __init__(self):
            super().__init__(); self.n1=nn.LayerNorm(args.d_model); self.n2=nn.LayerNorm(args.d_model)
            self.attn=nn.MultiheadAttention(args.d_model,args.heads,batch_first=True)
            self.ff=nn.Sequential(nn.Linear(args.d_model,args.d_model*4),nn.GELU(),nn.Linear(args.d_model*4,args.d_model))
        def forward(self,x,mask):
            n=self.n1(x); x=x+self.attn(n,n,n,attn_mask=mask,need_weights=False)[0]
            return x+self.ff(self.n2(x))
    class OmniCore(nn.Module):
        def __init__(self):
            super().__init__(); self.tok=nn.Embedding(256,args.d_model); self.pos=nn.Embedding(args.block_size,args.d_model)
            self.blocks=nn.ModuleList([CustomBlock() for _ in range(args.layers)])
            self.norm=nn.LayerNorm(args.d_model); self.head=nn.Linear(args.d_model,256)
        def forward(self,ids):
            n=ids.size(1); pos=torch.arange(n,device=ids.device).unsqueeze(0)
            x=self.tok(ids)+self.pos(pos); mask=torch.triu(torch.ones(n,n,device=ids.device,dtype=torch.bool),diagonal=1)
            for block in self.blocks: x=block(x,mask)
            return self.head(self.norm(x))
    class ScratchTransformer(nn.Module):
        def __init__(self):
            super().__init__(); self.tok=nn.Embedding(256,args.d_model); self.pos=nn.Embedding(args.block_size,args.d_model)
            layer=nn.TransformerEncoderLayer(d_model=args.d_model,nhead=args.heads,dim_feedforward=args.d_model*4,
                batch_first=True,norm_first=True,activation="gelu")
            self.encoder=nn.TransformerEncoder(layer,num_layers=args.layers); self.norm=nn.LayerNorm(args.d_model)
            self.head=nn.Linear(args.d_model,256)
        def forward(self,ids):
            n=ids.size(1); pos=torch.arange(n,device=ids.device).unsqueeze(0)
            x=self.tok(ids)+self.pos(pos); mask=torch.triu(torch.ones(n,n,device=ids.device,dtype=torch.bool),diagonal=1)
            return self.head(self.norm(self.encoder(x,mask=mask)))
    model=(OmniCore() if args.mode=="B" else ScratchTransformer()).to(device)
    optimizer=torch.optim.AdamW(model.parameters(),lr=args.learning_rate)
    train_loader=DataLoader(train_ds,batch_size=args.batch_size,shuffle=True)
    val_loader=DataLoader(val_ds,batch_size=args.batch_size,shuffle=False)
    def evaluate():
        model.eval(); values=[]
        with torch.no_grad():
            for x,y in val_loader:
                logits=model(x.to(device)); loss=F.cross_entropy(logits.reshape(-1,256),y.to(device).reshape(-1),ignore_index=-100)
                values.append(float(loss.item()))
        return sum(values)/max(1,len(values))
    history=[]
    for epoch in range(args.epochs):
        model.train(); losses=[]
        for x,y in train_loader:
            x=x.to(device); y=y.to(device); optimizer.zero_grad(set_to_none=True)
            logits=model(x); loss=F.cross_entropy(logits.reshape(-1,256),y.reshape(-1),ignore_index=-100)
            loss.backward(); nn.utils.clip_grad_norm_(model.parameters(),1.0); optimizer.step(); losses.append(float(loss.item()))
        train_loss=sum(losses)/max(1,len(losses)); val_loss=evaluate()
        history.append({"epoch":epoch+1,"trainLoss":train_loss,"validationLoss":val_loss})
        torch.save({"epoch":epoch+1,"model":model.state_dict(),"optimizer":optimizer.state_dict(),"history":history},
                   out/("checkpoint-epoch-%d.pt"%(epoch+1)))
    artifact=out/"model.pt"; torch.save({"model":model.state_dict(),"config":vars(args),"history":history},artifact)
    return {"trainLoss":history[-1]["trainLoss"],"validationLoss":history[-1]["validationLoss"],
        "epochsCompleted":args.epochs,"trainWindowCount":len(train_ds),"validationWindowCount":len(val_ds),"history":history},artifact,str(device),len(train_ds),len(val_ds),fallback

def smoke_test_one_update():
    import torch
    from torch import nn
    model=nn.Sequential(nn.Embedding(256,16),nn.Linear(16,256)); opt=torch.optim.AdamW(model.parameters(),lr=1e-2)
    before=model[0].weight.detach().clone(); x=torch.tensor([[1,2,3]]); y=torch.tensor([[2,3,4]])
    loss=nn.functional.cross_entropy(model(x).reshape(-1,256),y.reshape(-1)); loss.backward(); opt.step()
    if not torch.isfinite(loss) or torch.equal(before,model[0].weight.detach()): raise AssertionError("Aucune mise à jour réelle des poids.")
    return float(loss.item())

def main():
    p=argparse.ArgumentParser(description="Omniverse NXS training engine")
    p.add_argument("--mode",choices=["A","B","C"],required=True); p.add_argument("--data",required=True)
    p.add_argument("--output_dir",default="omniverse-results"); p.add_argument("--model_name",default="Qwen/Qwen2.5-0.5B")
    p.add_argument("--d_model",type=int,default=256); p.add_argument("--heads",type=int,default=8)
    p.add_argument("--layers",type=int,default=2); p.add_argument("--batch_size",type=int,default=4)
    p.add_argument("--learning_rate",type=float,default=3e-4); p.add_argument("--epochs",type=int,default=3)
    p.add_argument("--block_size",type=int,default=256); args=p.parse_args()
    if args.epochs<1 or args.block_size<2 or args.batch_size<1 or args.learning_rate<=0: raise SystemExit("Paramètres d’entraînement invalides.")
    random.seed(42)
    import torch
    torch.manual_seed(42)
    if torch.cuda.is_available(): torch.cuda.manual_seed_all(42)
    data_path=Path(args.data)
    if not data_path.is_file() or data_path.suffix.lower()!=".nxs": raise SystemExit("Sélectionnez un fichier .nxs existant.")
    out=Path(args.output_dir); out.mkdir(parents=True,exist_ok=True)
    sequences=parse_nxs(data_path.read_bytes()); print("%d séquences NXS validées."%len(sequences))
    started=time.time()
    if args.mode=="A": metrics,artifact,device,train_count,val_count,fallback=train_a(args,sequences,out)
    else: metrics,artifact,device,train_count,val_count,fallback=train_bc(args,sequences,out)
    manifest={"schemaVersion":1,"status":"completed","mode":args.mode,
        "engine":{"A":"Hugging Face + PEFT LoRA","B":"OmniCore custom byte Transformer","C":"PyTorch Transformer from random initialization"}[args.mode],
        "modelName":args.model_name if args.mode=="A" else ("OmniCore-custom" if args.mode=="B" else "Scratch-Transformer"),
        "datasetName":data_path.name,"datasetSha256":hashlib.sha256(data_path.read_bytes()).hexdigest(),
        "sequenceCount":len(sequences),"trainSampleCount":train_count,"validationSampleCount":val_count,
        "validationFallback":fallback,"metrics":metrics,"artifact":str(artifact),"device":device,
        "completedAt":datetime.now(timezone.utc).isoformat(),"durationSeconds":round(time.time()-started,2),
        "notes":["B/C apprennent des régularités d’octets, pas une compréhension visuelle sémantique.",
        "A exclut VISION et filtre les segments CYBER non textuels.",
        "Un fichier NXS isolé ne prouve pas sa provenance; n’utilisez pas les corpus de démonstration."]}
    (out/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
    print("Entraînement terminé. Manifeste :",out/"manifest.json")

if __name__=="__main__": main()
