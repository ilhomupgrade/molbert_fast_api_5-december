import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";

const documentTypeColors = {
  "ГОСТ": "bg-blue-100 text-blue-700 border-blue-200",
  "СанПиН": "bg-green-100 text-green-700 border-green-200",
  "Правила": "bg-purple-100 text-purple-700 border-purple-200",
  "Инструкция": "bg-orange-100 text-orange-700 border-orange-200",
  "Приказ": "bg-red-100 text-red-700 border-red-200",
  "Другое": "bg-gray-100 text-gray-700 border-gray-200"
};

export default function DocumentCard({ document, onDelete }) {
  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0 hover:shadow-xl transition-all duration-300 group">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-green-50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                {document.title}
              </h3>
              <Badge 
                variant="outline"
                className={`${documentTypeColors[document.document_type]} border text-xs`}
              >
                {document.document_type}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        {document.number && (
          <div className="mb-3">
            <p className="text-sm text-gray-500">Номер документа</p>
            <p className="font-medium text-gray-900">{document.number}</p>
          </div>
        )}

        {document.date_issued && (
          <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(document.date_issued), "dd.MM.yyyy")}</span>
          </div>
        )}

        {document.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {document.description}
          </p>
        )}

        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {document.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          {document.file_url && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(document.file_url, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Открыть
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}