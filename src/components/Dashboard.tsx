
import React from "react";
import { Card, Badge, SectionTitle } from "./ui";

interface DashboardProps {
  corpusCount?: number;
  onNavigate?: (page: string) => void;
}

export default function Dashboard({
  corpusCount = 0,
  onNavigate,
}: DashboardProps) {
  return (
    <main className="space-y-6">
      <header>
        <Badge className="bg-emerald-500/10 text-emerald-400">
          NEXUS-ZERO WORKSPACE
        </Badge>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          Votre espace de travail
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Concevez, inspectez et organisez vos corpus multimodaux.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-400">Corpus disponibles</p>
          <p className="mt-2 text-3xl font-bold">{corpusCount}</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-400">Workspace</p>
          <p className="mt-2 text-xl font-semibold">NEXUS Research</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-400">État du système</p>
          <p className="mt-2 text-xl font-semibold text-emerald-400">
            Prêt
          </p>
        </Card>
      </div>

      <Card>
        <SectionTitle>Accès rapide</SectionTitle>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => onNavigate?.("corpus")}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black"
          >
            Explorer les corpus
          </button>
          <button
            onClick={() => onNavigate?.("training")}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm"
          >
            Configuration
          </button>
        </div>
      </Card>
    </main>
  );
}
