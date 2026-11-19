# Omniverse real training engine

The static website prepares a standalone Colab/Kaggle notebook. Training runs only inside the selected notebook runtime; the Render static site does not own a GPU or control a remote notebook session.

- A: Hugging Face causal LM fine-tuning with PEFT/LoRA. Text is extracted from THINK, FORGE, MCP and sufficiently readable CYBER segments; VISION is excluded.
- B: custom OmniCore byte Transformer.
- C: standard PyTorch Transformer initialized with random weights and trained from scratch.

Modes B/C train on NXS sequence bytes, including raw VISION payload bytes. This is byte-level learning, not semantic image understanding.

Run parser tests with: python -m unittest discover -s training/tests

Each run writes checkpoints/model artifacts and manifest.json. Import the manifest JSON into the app to display measured metrics. Model weights remain separate files.
