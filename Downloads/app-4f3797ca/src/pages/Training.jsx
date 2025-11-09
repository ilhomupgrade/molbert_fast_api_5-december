import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, 
  Award, 
  BookOpen, 
  Trophy, 
  TrendingUp,
  CheckCircle2,
  XCircle
} from "lucide-react";
import TestCard from "../components/training/TestCard";
import TestSession from "../components/training/TestSession";

export default function TrainingPage() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [testSession, setTestSession] = useState(null);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list(),
  });

  const { data: testResults = [] } = useQuery({
    queryKey: ['testResults', user?.email],
    queryFn: () => user ? base44.entities.TestResult.filter({ user_email: user.email }, '-created_date') : [],
    enabled: !!user,
  });

  const categories = [
    "Общие требования",
    "Электробезопасность",
    "Пожарная безопасность",
    "Работа на высоте",
    "СОУТ",
    "СИЗ",
    "Первая помощь"
  ];

  const getCategoryStats = (category) => {
    const categoryResults = testResults.filter(r => r.category === category);
    if (categoryResults.length === 0) return { attempted: false, lastScore: null };
    
    const lastResult = categoryResults[0];
    return {
      attempted: true,
      lastScore: lastResult.percentage,
      passed: lastResult.passed,
    };
  };

  const startTest = (category) => {
    const categoryQuestions = questions.filter(q => q.category === category);
    if (categoryQuestions.length === 0) {
      return;
    }
    
    setTestSession({
      category,
      questions: categoryQuestions,
      currentQuestionIndex: 0,
      answers: [],
      startTime: Date.now(),
    });
  };

  const completeTest = async (answers) => {
    if (!user || !testSession) return;

    const correctAnswers = testSession.questions.filter((q, idx) => {
      const userAnswer = answers[idx];
      const correctOption = q.options.find(opt => opt.is_correct);
      return userAnswer === correctOption?.text;
    }).length;

    const percentage = (correctAnswers / testSession.questions.length) * 100;
    const duration = Math.floor((Date.now() - testSession.startTime) / 1000);

    await base44.entities.TestResult.create({
      user_email: user.email,
      category: testSession.category,
      score: correctAnswers,
      total_questions: testSession.questions.length,
      percentage: Math.round(percentage),
      passed: percentage >= 70,
      duration_seconds: duration,
    });

    queryClient.invalidateQueries({ queryKey: ['testResults'] });
    setTestSession(null);
  };

  if (testSession) {
    return (
      <TestSession
        session={testSession}
        onComplete={completeTest}
        onCancel={() => setTestSession(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Обучение и тестирование</h1>
              <p className="text-gray-600">Проверьте свои знания по охране труда</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Пройдено тестов</p>
                  <p className="text-3xl font-bold text-gray-900">{testResults.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Успешно сдано</p>
                  <p className="text-3xl font-bold text-green-600">
                    {testResults.filter(r => r.passed).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Средний балл</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {testResults.length > 0
                      ? Math.round(testResults.reduce((sum, r) => sum + r.percentage, 0) / testResults.length)
                      : 0}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Доступные категории</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <TestCard
              key={category}
              category={category}
              stats={getCategoryStats(category)}
              questionCount={questions.filter(q => q.category === category).length}
              onStart={() => startTest(category)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}