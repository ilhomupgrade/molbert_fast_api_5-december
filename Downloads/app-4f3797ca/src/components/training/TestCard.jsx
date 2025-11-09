import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, PlayCircle, BookOpen } from "lucide-react";

const categoryIcons = {
  "Общие требования": "📋",
  "Электробезопасность": "⚡",
  "Пожарная безопасность": "🔥",
  "Работа на высоте": "🪜",
  "СОУТ": "📊",
  "СИЗ": "🦺",
  "Первая помощь": "🏥"
};

export default function TestCard({ category, stats, questionCount, onStart }) {
  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0 hover:shadow-xl transition-all duration-300 overflow-hidden group">
      <div className="h-2 bg-gradient-to-r from-blue-600 to-green-600" />
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="text-4xl">{categoryIcons[category]}</div>
          {stats.attempted && (
            <Badge 
              variant="outline"
              className={stats.passed ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}
            >
              {stats.passed ? (
                <CheckCircle2 className="w-3 h-3 mr-1" />
              ) : (
                <XCircle className="w-3 h-3 mr-1" />
              )}
              {stats.lastScore}%
            </Badge>
          )}
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-2">{category}</h3>
        
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <BookOpen className="w-4 h-4" />
          <span>{questionCount} {questionCount === 1 ? 'вопрос' : questionCount < 5 ? 'вопроса' : 'вопросов'}</span>
        </div>

        <Button
          onClick={onStart}
          disabled={questionCount === 0}
          className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white group-hover:shadow-lg transition-all"
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          {stats.attempted ? 'Пройти снова' : 'Начать тест'}
        </Button>
      </CardContent>
    </Card>
  );
}