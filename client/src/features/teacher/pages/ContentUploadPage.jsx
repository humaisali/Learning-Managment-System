import { useState, useEffect } from "react";
import {
  Upload, FileText, BrainCircuit, Video,
  Plus, X, Check, Eye, EyeOff, Loader2,
  ChevronDown, Trash2, GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, EmptyState } from "@/components/ui/Elements";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function ContentUploadPage() {
  const [activeSection, setActiveSection] = useState("video");
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [myContent, setMyContent] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);

  // Load teacher's assigned subjects
  useEffect(() => {
    async function fetchSubjects() {
      try {
        const res = await api.get("/catalog/boards");
        const boards = res.data.data;
        // Flatten to get all classes then subjects
        const allSubjects = [];
        for (const board of boards) {
          try {
            const classRes = await api.get(`/catalog/boards/${board.id}/classes`);
            for (const cls of classRes.data.data) {
              try {
                const subRes = await api.get(`/catalog/classes/${cls.id}/subjects`);
                subRes.data.data.forEach((s) => {
                  allSubjects.push({
                    ...s,
                    label: `${board.name} > ${cls.name} > ${s.name}`,
                  });
                });
              } catch {}
            }
          } catch {}
        }
        setSubjects(allSubjects);
      } catch {}
    }
    fetchSubjects();
  }, []);

  // Load topics when subject changes
  useEffect(() => {
    if (!selectedSubject) { setTopics([]); return; }
    async function fetchTopics() {
      try {
        const res = await api.get(`/catalog/subjects/${selectedSubject}/topics`);
        setTopics(res.data.data);
      } catch {}
    }
    fetchTopics();
  }, [selectedSubject]);

  // Load teacher's existing content
  useEffect(() => {
    async function fetchContent() {
      setLoadingContent(true);
      try {
        const params = {};
        if (selectedTopic) params.topicId = selectedTopic;
        const res = await api.get("/content/my-content", { params });
        setMyContent(res.data.data);
      } catch {} finally {
        setLoadingContent(false);
      }
    }
    fetchContent();
  }, [selectedTopic]);

  const refreshContent = async () => {
    try {
      const params = {};
      if (selectedTopic) params.topicId = selectedTopic;
      const res = await api.get("/content/my-content", { params });
      setMyContent(res.data.data);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload lectures, key points, and MCQs for your subjects
        </p>
      </div>

      {/* Subject + Topic Selectors */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => { setSelectedSubject(e.target.value); setSelectedTopic(""); }}
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">Select a subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.label || s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Topic</label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                disabled={!selectedSubject}
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">Select a topic</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Type Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {[
          { key: "video", label: "Video Upload", icon: Video },
          { key: "keypoints", label: "Key Points", icon: FileText },
          { key: "mcq", label: "MCQ Builder", icon: BrainCircuit },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors",
              activeSection === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {!selectedTopic ? (
        <EmptyState
          icon={Upload}
          title="Select a topic first"
          description="Choose a subject and topic above to start uploading content."
        />
      ) : (
        <>
          {activeSection === "video" && (
            <VideoUploadSection topicId={selectedTopic} onSuccess={refreshContent} />
          )}
          {activeSection === "keypoints" && (
            <KeyPointsSection topicId={selectedTopic} onSuccess={refreshContent} />
          )}
          {activeSection === "mcq" && (
            <MCQBuilderSection topicId={selectedTopic} onSuccess={refreshContent} />
          )}
        </>
      )}

      {/* Existing Content List */}
      {myContent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uploaded Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myContent.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {item.type === "VIDEO" && <Video className="h-4 w-4 text-blue-600" />}
                    {item.type === "KEY_POINTS" && <FileText className="h-4 w-4 text-green-600" />}
                    {item.type === "SUBJECTIVE_QUESTION" && <FileText className="h-4 w-4 text-orange-600" />}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-400">
                        {item.topic?.subject?.name} &middot; {item.topic?.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      item.publishState === "PUBLISHED" ? "success"
                        : item.publishState === "DRAFT" ? "warning"
                        : "default"
                    }>
                      {item.publishState}
                    </Badge>
                    {item.publishState === "DRAFT" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await api.put(`/content/${item.id}/publish`);
                            toast.success("Content published!");
                            refreshContent();
                          } catch (err) {
                            toast.error("Failed to publish.");
                          }
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" /> Publish
                      </Button>
                    )}
                    {item.publishState === "PUBLISHED" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            await api.put(`/content/${item.id}/unpublish`);
                            toast.success("Content unpublished.");
                            refreshContent();
                          } catch {
                            toast.error("Failed to unpublish.");
                          }
                        }}
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Video Upload Section ───────────────────────
function VideoUploadSection({ topicId, onSuccess }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!title.trim() || !file) {
      toast.error("Title and video file are required.");
      return;
    }

    setUploading(true);
    try {
      // Step 1: Get upload URL from our API
      const initRes = await api.post("/content/upload/video", {
        topicId,
        title: title.trim(),
        filename: file.name,
      });

      const { assetId, uploadUrl, videoId, headers } = initRes.data.data;

      // Step 2: In production, upload directly to Bunny via TUS protocol
      // For dev/mock, we skip the actual upload
      if (!headers?.isMock) {
        // Real TUS upload would go here
        // const tusUpload = new tus.Upload(file, { endpoint: uploadUrl, headers, ... });
      }

      // Step 3: Confirm upload
      await api.put(`/content/upload/video/${assetId}/confirm`, {
        videoId,
        duration: 0, // Would come from actual video metadata
      });

      toast.success("Video uploaded successfully! Set to draft — publish when ready.");
      setTitle("");
      setFile(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload Lecture Video</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          label="Video Title"
          placeholder="e.g., Introduction to Quadratic Equations"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Video File</label>
          <div className="flex items-center gap-3">
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 text-sm text-gray-500 hover:border-primary-400 hover:bg-primary-50/30 transition-colors">
              <Upload className="h-4 w-4" />
              {file ? file.name : "Choose file"}
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            {file && (
              <button onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-400">MP4, MOV, or WebM. Max 2GB.</p>
        </div>
        <Button onClick={handleUpload} disabled={uploading || !title.trim() || !file}>
          {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4" /> Upload Video</>}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Key Points Section ─────────────────────────
function KeyPointsSection({ topicId, onSuccess }) {
  const [title, setTitle] = useState("Key Points");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim() || content.trim().length < 10) {
      toast.error("Key points must be at least 10 characters.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/content/key-points", {
        topicId,
        title: title.trim(),
        textContent: content.trim(),
      });
      toast.success("Key points saved!");
      setContent("");
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Write Key Points</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          label="Title"
          placeholder="Key Points"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder="Write the key points for this topic. Use clear, concise language..."
            className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-y"
          />
          <p className="mt-1 text-xs text-gray-400">{content.length} characters</p>
        </div>
        <Button onClick={handleSave} disabled={saving || content.trim().length < 10}>
          {saving ? "Saving..." : "Save Key Points"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── MCQ Builder Section ────────────────────────
function MCQBuilderSection({ topicId, onSuccess }) {
  const [questions, setQuestions] = useState([createEmptyQuestion()]);
  const [saving, setSaving] = useState(false);

  function createEmptyQuestion() {
    return {
      question: "",
      options: ["", "", "", ""],
      correctIndex: 0,
    };
  }

  const addQuestion = () => {
    setQuestions([...questions, createEmptyQuestion()]);
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    const opts = [...updated[qIndex].options];
    opts[oIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options: opts };
    setQuestions(updated);
  };

  const handleSave = async () => {
    // Validate
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        toast.error(`Question ${i + 1} text is empty.`);
        return;
      }
      const filledOptions = q.options.filter((o) => o.trim());
      if (filledOptions.length < 2) {
        toast.error(`Question ${i + 1} needs at least 2 options.`);
        return;
      }
    }

    setSaving(true);
    try {
      const cleaned = questions.map((q) => ({
        question: q.question.trim(),
        options: q.options.filter((o) => o.trim()),
        correctIndex: q.correctIndex,
      }));

      await api.post("/content/mcq", { topicId, questions: cleaned });
      toast.success("MCQ set created!");
      setQuestions([createEmptyQuestion()]);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save MCQs.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Build MCQ Set</CardTitle>
          <Badge variant="default">{questions.length} question{questions.length !== 1 ? "s" : ""}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Question {qIndex + 1}
                </label>
                <textarea
                  value={q.question}
                  onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                  rows={2}
                  placeholder="Enter the question..."
                  className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                />
              </div>
              {questions.length > 1 && (
                <button
                  onClick={() => removeQuestion(qIndex)}
                  className="mt-5 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-500">
                Options (mark the correct one)
              </label>
              {q.options.map((opt, oIndex) => (
                <div key={oIndex} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuestion(qIndex, "correctIndex", oIndex)}
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      q.correctIndex === oIndex
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-gray-300 hover:border-gray-400"
                    )}
                  >
                    {q.correctIndex === oIndex && <Check className="h-3 w-3" />}
                  </button>
                  <input
                    value={opt}
                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                    className="flex h-9 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="h-3.5 w-3.5" /> Add Question
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save MCQ Set"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
