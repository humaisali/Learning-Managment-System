import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, PlayCircle, FileText, BrainCircuit,
  ChevronDown, ChevronUp, CheckCircle, MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, Spinner, EmptyState } from "@/components/ui/Elements";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import VideoPlayer from "../components/VideoPlayer";
import MCQPractice from "../components/MCQPractice";
import DoubtSubmission from "../components/DoubtSubmission";

export default function TopicViewPage() {
  const { topicId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("video");
  const [activeMCQSet, setActiveMCQSet] = useState(null);
  const [keyPointsExpanded, setKeyPointsExpanded] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get(`/content/topic/${topicId}`);
        setData(res.data.data);

        // Auto-select first tab with content
        const d = res.data.data;
        if (d.videos.length > 0) setActiveTab("video");
        else if (d.keyPoints.length > 0) setActiveTab("keypoints");
        else if (d.mcqSets.length > 0) setActiveTab("mcq");
      } catch {
        // error
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [topicId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={FileText}
        title="Topic not found"
        description="This topic may not exist or content hasn't been published yet."
      />
    );
  }

  const { topic, videos, keyPoints, mcqSets, subjectiveQuestions } = data;
  const primaryVideo = videos[0] || null;

  const tabs = [
    { key: "video", label: "Lecture", icon: PlayCircle, count: videos.length, show: videos.length > 0 },
    { key: "keypoints", label: "Key Points", icon: FileText, count: keyPoints.length, show: keyPoints.length > 0 },
    { key: "mcq", label: "Practice MCQ", icon: BrainCircuit, count: mcqSets.length, show: mcqSets.length > 0 },
    { key: "doubts", label: "Ask a Doubt", icon: MessageSquare, count: 0, show: true },
  ].filter((t) => t.show);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          to={`/student/subjects/${topic.subject?.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {topic.subject?.name || "Back"}
        </Link>
        <h1 className="mt-2 text-xl font-bold text-gray-900">{topic.title}</h1>
        <div className="mt-1 flex items-center gap-2">
          {topic.subject?.class?.board && (
            <Badge variant="default">{topic.subject.class.board.name}</Badge>
          )}
          {topic.subject?.class && (
            <Badge variant="default">{topic.subject.class.name}</Badge>
          )}
          {topic.subject?.module?.program && (
            <Badge variant="primary">{topic.subject.module.program.name}</Badge>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className="text-xs text-gray-400">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* ─── Video Tab ─────────────────────── */}
          {activeTab === "video" && (
            <div className="space-y-4">
              {primaryVideo ? (
                <VideoPlayer
                  assetId={primaryVideo.id}
                  title={primaryVideo.title}
                  duration={primaryVideo.duration}
                  topicId={topic.id}
                  onProgress={(p) => {
                    // Progress callback — can trigger UI updates
                  }}
                />
              ) : (
                <EmptyState
                  icon={PlayCircle}
                  title="No video yet"
                  description="The lecture video for this topic hasn't been published."
                />
              )}

              {/* Inline Key Points below video */}
              {keyPoints.length > 0 && activeTab === "video" && (
                <Card>
                  <button
                    onClick={() => setKeyPointsExpanded(!keyPointsExpanded)}
                    className="flex w-full items-center justify-between px-6 py-4"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary-600" />
                      <span className="text-sm font-semibold text-gray-900">Key Points</span>
                    </div>
                    {keyPointsExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                  {keyPointsExpanded && (
                    <CardContent className="pt-0">
                      <div className="prose prose-sm max-w-none text-gray-700">
                        {keyPoints.map((kp) => (
                          <div key={kp.id}>
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">{kp.title}</h4>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                              {kp.textContent}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* ─── Key Points Tab ────────────────── */}
          {activeTab === "keypoints" && (
            <div className="space-y-4">
              {keyPoints.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No key points yet"
                  description="Key points for this topic haven't been published."
                />
              ) : (
                keyPoints.map((kp) => (
                  <Card key={kp.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{kp.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                        {kp.textContent}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* ─── MCQ Tab ───────────────────────── */}
          {activeTab === "mcq" && (
            <div className="space-y-4">
              {mcqSets.length === 0 ? (
                <EmptyState
                  icon={BrainCircuit}
                  title="No practice questions"
                  description="MCQs for this topic haven't been added yet."
                />
              ) : activeMCQSet ? (
                <div>
                  <button
                    onClick={() => setActiveMCQSet(null)}
                    className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to MCQ sets
                  </button>
                  <MCQPractice
                    mcqSet={activeMCQSet}
                    onComplete={(result) => {
                      // Could trigger a toast or update progress
                    }}
                  />
                </div>
              ) : (
                mcqSets.map((set, idx) => (
                  <Card key={set.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="flex items-center justify-between py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                          <BrainCircuit className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Practice Set {idx + 1}
                          </p>
                          <p className="text-xs text-gray-500">
                            {set.questionCount} question{set.questionCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveMCQSet(set)}
                      >
                        Start Practice
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* ─── Doubts Tab ────────────────────── */}
          {activeTab === "doubts" && (
            <DoubtSubmission
              topicId={topicId}
              topicTitle={topic.title}
            />
          )}
        </div>

        {/* Sidebar — Topic Navigation */}
        <div className="hidden lg:block">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">In this topic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {videos.length > 0 && (
                <SidebarItem
                  icon={PlayCircle}
                  label={`${videos.length} Lecture Video${videos.length > 1 ? "s" : ""}`}
                  active={activeTab === "video"}
                  onClick={() => setActiveTab("video")}
                />
              )}
              {keyPoints.length > 0 && (
                <SidebarItem
                  icon={FileText}
                  label="Key Points"
                  active={activeTab === "keypoints"}
                  onClick={() => setActiveTab("keypoints")}
                />
              )}
              {mcqSets.length > 0 && (
                <SidebarItem
                  icon={BrainCircuit}
                  label={`${mcqSets.reduce((s, m) => s + m.questionCount, 0)} MCQ Questions`}
                  active={activeTab === "mcq"}
                  onClick={() => setActiveTab("mcq")}
                />
              )}
              {subjectiveQuestions.length > 0 && (
                <SidebarItem
                  icon={FileText}
                  label={`${subjectiveQuestions.length} Written Question${subjectiveQuestions.length > 1 ? "s" : ""}`}
                  active={false}
                  onClick={() => {}}
                />
              )}
              <SidebarItem
                icon={MessageSquare}
                label="Ask a Doubt"
                active={activeTab === "doubts"}
                onClick={() => setActiveTab("doubts")}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors text-left",
        active
          ? "bg-primary-50 text-primary-700 font-medium"
          : "text-gray-600 hover:bg-gray-50"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}
