import { useState } from "react";
import { Send, MessageSquare, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function DoubtSubmission({ topicId, topicTitle, onSubmitted }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (text.trim().length < 20) {
      toast.error("Your question must be at least 20 characters. Be specific about what confuses you.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/doubts/submit", { topicId, text: text.trim() });
      setSubmitted(true);
      setText("");
      toast.success("Doubt submitted! Your teacher will respond soon.");
      if (onSubmitted) onSubmitted();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit doubt.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Doubt submitted</h3>
          <p className="mt-1 text-xs text-gray-500">
            Your teacher will be notified and respond as soon as possible.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setSubmitted(false)}
          >
            Ask another question
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary-600" />
          Ask a Doubt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-500">
          Stuck on something in <span className="font-medium">{topicTitle}</span>?
          Describe your confusion clearly so the teacher can help you.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Describe what you're confused about. Be specific — mention which part of the lecture or concept is unclear..."
          className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-y"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {text.length}/2000 characters
            {text.length > 0 && text.length < 20 && (
              <span className="text-red-500 ml-2">Minimum 20 characters</span>
            )}
          </span>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || text.trim().length < 20}
          >
            {submitting ? "Submitting..." : <><Send className="h-3.5 w-3.5" /> Submit</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
