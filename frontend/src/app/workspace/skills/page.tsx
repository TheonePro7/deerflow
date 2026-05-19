"use client";

import { useEffect, useState, useCallback } from "react";
import {
  WrenchIcon,
  FlameIcon,
  ExternalLinkIcon,
  StarIcon,
  SearchIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  BoxIcon,
  GlobeIcon,
  CheckCircleIcon,
  XCircleIcon,
  Loader,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  WorkspaceBody,
  WorkspaceContainer,
  WorkspaceHeader,
} from "@/components/workspace/workspace-container";
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
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-6">
          {/* 页面标题 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">技能管理</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">管理已安装的技能，发现 GitHub 热门项目</p>
            </div>
          </div>

          {/* Tab 切换 */}
          <Tabs defaultValue="installed" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="installed" className="gap-2">
                <BoxIcon className="size-4" />
                已安装技能
                {!skillsLoading && <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs">{skills.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="trending" className="gap-2">
                <FlameIcon className="size-4 text-orange-500" />
                GitHub 热门
              </TabsTrigger>
            </TabsList>

            {/* 已安装技能 Tab */}
            <TabsContent value="installed" className="mt-0 space-y-4">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索技能..."
                  value={skillSearch}
                  onChange={e => setSkillSearch(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>

              {skillsLoading ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">加载中...</div>
              ) : filteredSkills.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-2 py-12">
                    <WrenchIcon className="size-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">{skillSearch ? "没有匹配的技能" : "暂无已安装的技能"}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredSkills.map(skill => (
                    <Card key={skill.name} className="relative overflow-hidden">
                      <CardHeader className="pb-2 pr-12">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-medium">{skill.name}</CardTitle>
                          <Badge variant={skill.enabled ? "default" : "secondary"} className="text-xs">
                            {skill.enabled ? "启用" : "禁用"}
                          </Badge>
                        </div>
                        {skill.description && (
                          <CardDescription className="mt-1 text-xs leading-relaxed">{skill.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <Button
                          size="sm"
                          variant={skill.enabled ? "outline" : "default"}
                          disabled={toggling === skill.name}
                          onClick={() => toggleSkill(skill.name, skill.enabled)}
                          className="h-7 text-xs"
                        >
                          {toggling === skill.name ? (
                            <Loader className="size-3 animate-spin" />
                          ) : skill.enabled ? "禁用" : "启用"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* GitHub 热门 Tab */}
            <TabsContent value="trending" className="mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-1 rounded-lg bg-muted p-0.5">
                  {(["daily", "weekly", "monthly"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setTrendingTab(tab)}
                      className={cn(
                        "rounded-md px-3 py-1 text-xs font-medium transition-all",
                        trendingTab === tab ? "bg-background text-foreground shadow-xs" : "text-muted-foreground/50 hover:text-foreground",
                      )}
                    >
                      {tab === "daily" ? "今日" : tab === "weekly" ? "本周" : "本月"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => fetchTrending(trendingTab)}
                  className="rounded p-1 text-muted-foreground/40 transition-colors hover:text-foreground"
                >
                  <RefreshCwIcon className={cn("size-4", trendingLoading && "animate-spin")} />
                </button>
              </div>

              {trendingLoading ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">加载中...</div>
              ) : trending.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-2 py-12">
                    <GlobeIcon className="size-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">暂无热门项目</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {trending.map(item => (
                    <Card key={item.repo} className="transition-colors hover:bg-accent/30">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-medium">{item.repo}</CardTitle>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <StarIcon className="size-3" />
                            {item.stars}
                          </div>
                        </div>
                        <CardDescription className="mt-1 text-xs leading-relaxed line-clamp-2">{item.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" asChild>
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLinkIcon className="size-3" />
                            查看
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
