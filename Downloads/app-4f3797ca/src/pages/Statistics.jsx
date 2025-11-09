import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, MessageSquare, TrendingUp, Award, BookOpen } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function StatisticsPage() {
  const { data: conversationLogs = [] } = useQuery({
    queryKey: ['conversationLogs'],
    queryFn: () => base44.entities.ConversationLog.list('-created_date'),
  });

  const { data: testResults = [] } = useQuery({
    queryKey: ['allTestResults'],
    queryFn: () => base44.entities.TestResult.list('-created_date'),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list(),
  });

  const uniqueUsers = [...new Set(conversationLogs.map(log => log.user_email))].length;
  const totalQuestions = conversationLogs.length;
  const avgTestScore = testResults.length > 0
    ? Math.round(testResults.reduce((sum, r) => sum + r.percentage, 0) / testResults.length)
    : 0;
  const passRate = testResults.length > 0
    ? Math.round((testResults.filter(r => r.passed).length / testResults.length) * 100)
    : 0;

  const categoryData = testResults.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = { total: 0, passed: 0 };
    }
    acc[result.category].total++;
    if (result.passed) acc[result.category].passed++;
    return acc;
  }, {});

  const chartData = Object.keys(categoryData).map(category => ({
    name: category,
    total: categoryData[category].total,
    passed: categoryData[category].passed,
    passRate: Math.round((categoryData[category].passed / categoryData[category].total) * 100),
  }));

  const documentTypeData = documents.reduce((acc, doc) => {
    if (doc.status === 'active') {
      acc[doc.document_type] = (acc[doc.document_type] || 0) + 1;
    }
    return acc;
  }, {});

  const pieData = Object.keys(documentTypeData).map(type => ({
    name: type,
    value: documentTypeData[type],
  }));

  const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Статистика использования</h1>
              <p className="text-gray-600">Аналитика и отчеты по системе обучения</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Активные пользователи</p>
                  <p className="text-3xl font-bold text-gray-900">{uniqueUsers}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Всего вопросов</p>
                  <p className="text-3xl font-bold text-gray-900">{totalQuestions}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Средний балл</p>
                  <p className="text-3xl font-bold text-purple-600">{avgTestScore}%</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">% Сданных тестов</p>
                  <p className="text-3xl font-bold text-green-600">{passRate}%</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
            <CardHeader>
              <CardTitle>Результаты тестирования по категориям</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3B82F6" name="Всего попыток" />
                  <Bar dataKey="passed" fill="#10B981" name="Успешно" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
            <CardHeader>
              <CardTitle>Распределение документов по типам</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}