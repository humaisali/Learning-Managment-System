import { useState, useCallback } from "react";
import { CheckCircle, XCircle, ArrowRight, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function MCQPractice({ mcqSet, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const questions = mcqSet?.questions || [];
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;

  const selectOption = (questionIndex, optionIndex) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const goNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (answeredCount < totalQuestions) {
      toast.error(`Please answer all ${totalQuestions} questions before submitting.`);
      return;
    }

    setLoading(true);
    try {
      // Build answers array in order
      const answersArray = questions.map((_, i) => selectedAnswers[i] ?? -1);

      const response = await api.post("/content/mcq/attempt", {
        mcqSetId: mcqSet.id,
        answers: answersArray,
      });

      setResults(response.data.data);
      setSubmitted(true);

      if (onComplete) {
        onComplete(response.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit MCQ.");
    } finally {
      setLoading(false);
    }
  }, [answeredCount, totalQuestions, questions, selectedAnswers, mcqSet, onComplete]);

  const handleRetry = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    setResults(null);
    setCurrentIndex(0);
  };

  if (!mcqSet || questions.length === 0) {
    return null;
  }

  // Results screen
  if (submitted && results) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <div className={cn(
              "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full",
              results.score >= 70 ? "bg-green-100" : results.score >= 40 ? "bg-yellow-100" : "bg-red-100"
            )}>
              <Trophy className={cn(
                "h-8 w-8",
                results.score >= 70 ? "text-green-600" : results.score >= 40 ? "text-yellow-600" : "text-red-600"
              )} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{results.score}%</h3>
            <p className="mt-1 text-sm text-gray-500">
              {results.correct} out of {results.total} correct
            </p>
            <p className={cn(
              "mt-2 text-sm font-medium",
              results.score >= 70 ? "text-green-600" : results.score >= 40 ? "text-yellow-600" : "text-red-600"
            )}>
              {results.score >= 70 ? "Great job!" : results.score >= 40 ? "Keep practicing!" : "Review the material and try again."}
            </p>
          </div>

          {/* Answer Review */}
          <div className="mt-8 space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">Review Answers</h4>
            {results.results.map((r, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg border p-4",
                  r.isCorrect ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
                )}
              >
                <div className="flex items-start gap-2">
                  {r.isCorrect ? (
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      Q{i + 1}: {questions[i].question}
                    </p>
                    {!r.isCorrect && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-red-600">
                          Your answer: {questions[i].options[r.selected] || "Skipped"}
                        </p>
                        <p className="text-xs text-green-600">
                          Correct: {questions[i].options[r.correct]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <Button onClick={handleRetry} variant="outline">
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Question view
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Question {currentIndex + 1} of {totalQuestions}
          </CardTitle>
          <span className="text-xs text-gray-400">
            {answeredCount}/{totalQuestions} answered
          </span>
        </div>
        {/* Progress dots */}
        <div className="mt-3 flex gap-1.5">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "h-2 flex-1 rounded-full transition-colors",
                i === currentIndex
                  ? "bg-primary-600"
                  : selectedAnswers[i] !== undefined
                  ? "bg-primary-300"
                  : "bg-gray-200"
              )}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {/* Question Text */}
        <p className="text-sm font-medium text-gray-900 leading-relaxed">
          {currentQuestion.question}
        </p>

        {/* Options */}
        <div className="mt-4 space-y-2">
          {currentQuestion.options.map((option, optIdx) => {
            const isSelected = selectedAnswers[currentIndex] === optIdx;
            return (
              <button
                key={optIdx}
                onClick={() => selectOption(currentIndex, optIdx)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all",
                  isSelected
                    ? "border-primary-500 bg-primary-50 text-primary-900 ring-1 ring-primary-500"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <span className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  isSelected
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-500"
                )}>
                  {String.fromCharCode(65 + optIdx)}
                </span>
                <span className="flex-1">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={goPrev}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>

          {currentIndex < totalQuestions - 1 ? (
            <Button size="sm" onClick={goNext}>
              Next <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={loading || answeredCount < totalQuestions}
            >
              {loading ? "Submitting..." : "Submit Answers"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
