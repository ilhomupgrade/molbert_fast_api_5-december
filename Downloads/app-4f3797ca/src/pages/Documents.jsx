import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Plus, Upload, Loader2, Search } from "lucide-react";
import DocumentCard from "../components/documents/DocumentCard";
import DocumentUploadDialog from "../components/documents/DocumentUploadDialog";

export default function DocumentsPage() {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.filter({ status: 'active' }, '-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.update(id, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const filteredDocuments = documents.filter(doc => 
    doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Нормативные документы</h1>
                <p className="text-gray-600">Управление базой документов по охране труда</p>
              </div>
            </div>
            <Button
              onClick={() => setShowUploadDialog(true)}
              className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Добавить документ
            </Button>
          </div>

          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по названию, номеру или описанию..."
                  className="pl-10 py-6 text-base"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 mb-6">
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Всего документов: {filteredDocuments.length}</CardTitle>
              </div>
            </CardHeader>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onDelete={() => deleteMutation.mutate(document.id)}
              />
            ))}
          </div>
        )}

        {!isLoading && filteredDocuments.length === 0 && (
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-4">Документы не найдены</p>
              <Button
                onClick={() => setShowUploadDialog(true)}
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить первый документ
              </Button>
            </CardContent>
          </Card>
        )}

        <DocumentUploadDialog
          open={showUploadDialog}
          onClose={() => setShowUploadDialog(false)}
        />
      </div>
    </div>
  );
}