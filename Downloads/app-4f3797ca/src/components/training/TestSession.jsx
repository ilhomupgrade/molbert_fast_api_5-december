import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function TestSession({ session, onComplete, onCancel }) {
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState("");

  const currentQuestion = session.questions[session.currentQuestionIndex];
  const progress = ((session.currentQuestionIndex + 1) / session.questions.length) * 100;

  const handleNext = () => {
    const newAnswers = [...answers];
    newAnswers[session.currentQuestionIndex] = currentAnswer;
    setAnswers(newAnswers);

    if (session.currentQuestionIndex < session.questions.length - 1) {
      session.currentQuestionIndex++;
      setCurrentAnswer(newAnswers[session.currentQuestionIndex] || "");
    } else {
      onComplete(newAnswers);
    }
  };

  const handlePrevious = () => {
    if (session.currentQuestionIndex > 0) {
      session.currentQuestionIndex--;
      setCurrentAnswer(answers[session.currentQuestionIndex] || "");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={onCancel}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Отменить тест
          </Button>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                Вопрос {session.currentQuestionIndex + 1} из {session.questions.length}
              </span>
              <span className="text-sm font-bold text-blue-600">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-green-50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold">
                {session.currentQuestionIndex + 1}
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-gray-900 leading-relaxed">
                  {currentQuestion.question_text}
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-6">
            <RadioGroup value={currentAnswer} onValueChange={setCurrentAnswer}>
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      currentAnswer === option.text
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setCurrentAnswer(option.text)}
                  >
                    <RadioGroupItem value={option.text} id={`option-${idx}`} />
                    <Label
                      htmlFor={`option-${idx}`}
                      className="flex-1 cursor-pointer text-gray-900 leading-relaxed"
                    >
                      {option.text}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>

            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={session.currentQuestionIndex === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={!currentAnswer}
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
              >
                {session.currentQuestionIndex === session.questions.length - 1 ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Завершить тест
                  </>
                ) : (
                  <>
                    Далее
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}