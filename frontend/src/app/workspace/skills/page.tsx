"use client";

import { useEffect, useState, useCallback } from "react";
import { WrenchIcon, FlameIcon, ExternalLinkIcon, StarIcon, SearchIcon, RefreshCwIcon, TrendingUpIcon, BoxIcon, GlobeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Skill { name: string; description: string; category: string; enabled: boolean; }
interface TrendingSkill { repo: string; description: string; stars: number; url: string; }

export default function SkillsManagerPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [trending, setTrending] = useState<TrendingSkill[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingTab, setTrendingTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const [toggling, setToggling] = useState<string | null>(null);
  const [skillSearch, setSkillSearch] = useState("");

  const fetchSkills = useCallback(async () => {
    setSkillsLoading(true);
    try { const r = await fetch("/api/skills", { credentials: "include" }); if (r.ok) { const d = await r.json(); setSkills(d.skills ?? []); } } catch {}
    setSkillsLoading(false);
  }, []);
  const fetchTrending = useCallback(async (tab: string) => {
    setTrendingLoading(true);
    try { const r = await fetch(`/api/skills/trending?since=${tab}`, { credentials: "include" }); if (r.ok) { const d = await r.json(); setTrending(d.items ?? []); } } catch {}
    setTrendingLoading(false);
  }, []);
  useEffect(() => { fetchSkills(); }, [fetchSkills]);
  useEffect(() => { fetchTrending(trendingTab); }, [trendingTab, fetchTrending]);

  const toggleSkill = async (name: string, enabled: boolean) => {
    setToggling(name);
    try { await fetch(`/api/skills/${encodeURIComponent(name)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ enabled: !enabled }) }); setSkills(p => p.map(s => s.name === name ? { ...s, enabled: !enabled } : s)); } catch {}
    setToggling(null);
  };

  const filteredSkills = skills.filter(s => !skillSearch || s.name.toLowerCase().includes(skillSearch.toLowerCase()) || (s.description?.toLowerCase().includes(skillSearch.toLowerCase())));

  return (
    <div className="flex size-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">Skills</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">管理已安装的技能，发现 GitHub 热门项目</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* GitHub Trending */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlameIcon className="size-5 text-orange-500" />
                <CardTitle className="text-base">GitHub 热门</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                  {(["daily", "weekly", "monthly"] as const).map(tab => (
                    <button key={tab} onClick={() => setTrendingTab(tab)}
                      className={cn("text-xs px-2.5 py-0.5 rounded-md font-medium transition-all", trendingTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground/50 hover:text-foreground")}
                    >{tab === "daily" ? "今日" : tab === "weekly" ? "本周" : "本月"}</button>
                  ))}
                </div>
                <button onClick={() => fetchTrending(trendingTab)} className="text-muted-foreground/40 hover:text-foreground p-1 rounded transition-colors">
                  <RefreshCwIcon className={cn("size-4", trendingLoading && "animate-spin")} />
                </button>
              </div>
            </div>
            <CardDescription>按时间筛选 GitHub 上热门的 AI/Agent 开源项目</CardDescription>
          </CardHeader>
          <CardContent>
            {trendingLoading ? (
              <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">加载中...</div>
            ) : trending.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
                <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
                  <FlameIcon className="text-muted-foreground h-7 w-7" />
                </div>
                <p className="font-medium text-muted-foreground">暂无数据</p>
                <Button variant="outline" size="sm" onClick={() => fetchTrending(trendingTab)}>刷新</Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {trending.map((item, i) => (
                  <a key={item.repo} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 rounded-lg border px-3 py-2.5 hover:bg-accent/50 transition-colors group"
                  >
                    <span className="text-muted-foreground/30 text-xs font-mono w-4 shrink-0 mt-0.5">{i + 1}</span>
                    <GlobeIcon className="size-4 text-muted-foreground/30 shrink-0 mt-0.5 group-hover:text-orange-400 transition-colors" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{item.repo.split("/")[1]}</span>
                        <span className="text-muted-foreground/40 text-xs shrink-0">/{item.repo.split("/")[0]}</span>
                      </div>
                      {item.description && <div className="text-muted-foreground text-xs mt-0.5 leading-relaxed line-clamp-2">{item.description}</div>}
                      <div className="flex items-center gap-1 mt-1">
                        <StarIcon className="size-3 text-amber-400/60" />
                        <span className="text-xs text-muted-foreground/50">{item.stars >= 1000 ? `${(item.stars / 1000).toFixed(1)}k` : item.stars}</span>
                      </div>
                    </div>
                    <ExternalLinkIcon className="size-3 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors shrink-0 mt-0.5" />
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Installed Skills */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BoxIcon className="size-5 text-muted-foreground" />
                <CardTitle className="text-base">已安装技能</CardTitle>
                {!skillsLoading && <Badge variant="secondary" className="text-xs">{skills.length}</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
                  <Input placeholder="搜索..." value={skillSearch} onChange={e => setSkillSearch(e.target.value)} className="h-8 w-44 pl-8 text-xs" />
                </div>
                <button onClick={fetchSkills} className="text-muted-foreground/40 hover:text-foreground p-1 rounded transition-colors">
                  <RefreshCwIcon className={cn("size-4", skillsLoading && "animate-spin")} />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {skillsLoading ? (
              <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">加载中...</div>
            ) : filteredSkills.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
                <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
                  <BoxIcon className="text-muted-foreground h-7 w-7" />
                </div>
                <p className="font-medium text-muted-foreground">{skillSearch ? "没有匹配的技能" : "暂无已安装的技能"}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredSkills.map(s => (
                  <div key={s.name} className="flex items-start gap-3 rounded-lg border px-3 py-2.5">
                    <div className={cn("mt-1 size-2 rounded-full shrink-0", s.enabled ? "bg-green-500" : "bg-gray-300")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{s.name}</span>
                        {s.category && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{s.category}</Badge>}
                      </div>
                      {s.description && s.description !== "-" && <div className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{s.description}</div>}
                    </div>
                    <button onClick={() => toggleSkill(s.name, s.enabled)} disabled={toggling === s.name}
                      className={cn("shrink-0 text-xs px-2 py-0.5 rounded font-medium", s.enabled ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-200" : "bg-muted text-muted-foreground hover:bg-accent")}
                    >{toggling === s.name ? "..." : s.enabled ? "已启用" : "已禁用"}</button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
