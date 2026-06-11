import {
  BookMarked,
  Sparkles,
  MessagesSquare,
  LineChart,
  Lock,
  FileText,
  Plane,
} from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlightMotif } from "@/components/brand/FlightMotif";
import { NotebookCta } from "@/components/notebook/NotebookCta";

const SAMPLE_QUESTIONS = [
  { q: "Tell me about yourself.", ko: "자기소개를 해주세요." },
  {
    q: "Why do you want to become a cabin crew?",
    ko: "왜 승무원이 되고 싶으신가요?",
  },
  {
    q: "How would you handle a difficult passenger?",
    ko: "까다로운 승객을 어떻게 응대하시겠어요?",
  },
  {
    q: "Describe a time you delivered excellent service.",
    ko: "최고의 서비스를 제공했던 경험을 말해주세요.",
  },
];

export default async function OwnerNotebookPage() {
  const dict = await getDictionary();
  const n = dict.notebook;

  const features = [
    { icon: BookMarked, title: n.f1Title, desc: n.f1Desc },
    { icon: MessagesSquare, title: n.f2Title, desc: n.f2Desc },
    { icon: LineChart, title: n.f3Title, desc: n.f3Desc },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="welc-sky welc-glint welc-rise relative overflow-hidden rounded-2xl px-8 py-8 text-white shadow-md">
        <FlightMotif />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2">
            <Badge className="bg-[#F7C905] text-[#0f1e4a] hover:bg-[#F7C905]">
              {n.badge}
            </Badge>
            <span className="text-xs font-medium uppercase tracking-widest text-white/50">
              {n.phase}
            </span>
          </div>
          <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <Sparkles className="h-6 w-6 text-[#F7C905]" />
            {n.title}
          </h1>
          <p className="mt-2 text-sm text-white/70">{n.tagline}</p>
          <div className="mt-5">
            <NotebookCta label={n.cta} toastMsg={n.ctaToast} />
            <p className="mt-2 text-xs text-white/40">{n.ctaNote}</p>
          </div>
        </div>
      </div>

      {/* Feature trio */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title} className="welc-card-glow">
              <CardContent className="space-y-2 p-5">
                <div className="inline-flex rounded-xl bg-[#0f1e4a] p-2.5 text-[#F7C905]">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-semibold">{f.title}</p>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mock preview */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {n.previewTitle}
        </p>
        <div className="relative">
          {/* "locked" ribbon */}
          <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-[#0f1e4a] px-3 py-1 text-xs font-medium text-white">
            <Lock className="h-3.5 w-3.5" />
            {n.comingSoon}
          </div>

          <Card className="welc-card-glow overflow-hidden">
            <CardHeader className="border-b bg-muted/40">
              <CardTitle className="flex items-center gap-2 text-base">
                <Plane className="h-4 w-4 text-[#0f1e4a]" />
                {n.sampleClass}
              </CardTitle>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[n.sampleMat1, n.sampleMat2, n.sampleMat3].map((m) => (
                  <span
                    key={m}
                    className="flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs"
                  >
                    <FileText className="h-3 w-3" />
                    {m}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 p-6 lg:grid-cols-2">
              {/* AI-generated questions */}
              <div className="space-y-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-[#F7C905]" />
                  {n.aiQuestions}
                </p>
                <ul className="space-y-2">
                  {SAMPLE_QUESTIONS.map((s, i) => (
                    <li
                      key={i}
                      className="rounded-lg border bg-card p-3 text-sm shadow-sm"
                    >
                      <p className="font-medium">{s.q}</p>
                      <p className="text-xs text-muted-foreground">{s.ko}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Readiness mock */}
              <div className="space-y-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <LineChart className="h-4 w-4 text-emerald-500" />
                  {n.readiness}
                </p>
                <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
                  {[
                    { label: n.skill1, v: 82 },
                    { label: n.skill2, v: 68 },
                    { label: n.skill3, v: 91 },
                  ].map((s) => (
                    <div key={s.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{s.label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {s.v}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[#0f1e4a]"
                          style={{ width: `${s.v}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-muted-foreground">
                    {n.readinessNote}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
