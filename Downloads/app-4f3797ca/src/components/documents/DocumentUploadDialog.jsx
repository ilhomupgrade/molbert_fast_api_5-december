import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export default function DocumentUploadDialog({ open, onClose }) {
  const [formData, setFormData] = useState({
    title: "",
    document_type: "",
    number: "",
    date_issued: "",
    description: "",
    tags: "",
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.document_type) {
      toast.error("Заполните обязательные поля");
      return;
    }

    setUploading(true);
    try {
      let file_url = null;
      if (file) {
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        file_url = uploadResult.file_url;
      }

      const tags = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];

      await base44.entities.Document.create({
        title: formData.title,
        document_type: formData.document_type,
        number: formData.number,
        date_issued: formData.date_issued || null,
        description: formData.description,
        tags,
        file_url,
        status: "active",
      });

      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success("Документ успешно добавлен");
      onClose();
      setFormData({
        title: "",
        document_type: "",
        number: "",
        date_issued: "",
        description: "",
        tags: "",
      });
      setFile(null);
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Ошибка при загрузке документа");
    }
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить нормативный документ</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Название документа *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Например: Правила по охране труда..."
              required
            />
          </div>

          <div>
            <Label htmlFor="document_type">Тип документа *</Label>
            <Select
              value={formData.document_type}
              onValueChange={(value) => setFormData({ ...formData, document_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ГОСТ">ГОСТ</SelectItem>
                <SelectItem value="СанПиН">СанПиН</SelectItem>
                <SelectItem value="Правила">Правила</SelectItem>
                <SelectItem value="Инструкция">Инструкция</SelectItem>
                <SelectItem value="Приказ">Приказ</SelectItem>
                <SelectItem value="Другое">Другое</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="number">Номер документа</Label>
              <Input
                id="number"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                placeholder="№ 123-ФЗ"
              />
            </div>

            <div>
              <Label htmlFor="date_issued">Дата издания</Label>
              <Input
                id="date_issued"
                type="date"
                value={formData.date_issued}
                onChange={(e) => setFormData({ ...formData, date_issued: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Краткое описание содержания документа..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="tags">Теги (через запятую)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="электробезопасность, высота, СИЗ"
            />
          </div>

          <div>
            <Label htmlFor="file">Файл документа (PDF)</Label>
            <div className="mt-2">
              <input
                id="file"
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
              />
              <label htmlFor="file">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setFile(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Нажмите для выбора файла</p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={uploading}
              className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Добавить документ
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}