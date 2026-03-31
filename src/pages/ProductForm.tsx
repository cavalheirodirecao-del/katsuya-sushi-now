import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

const categories = [
  { id: "combos", name: "Combos" },
  { id: "porcoes", name: "Porções" },
  { id: "bebidas", name: "Bebidas" },
  { id: "sobremesas", name: "Sobremesas" },
  { id: "frete", name: "Frete" },
];

const ProductForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("-1");
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [flavors, setFlavors] = useState<string[]>([]);
  const [newFlavor, setNewFlavor] = useState("");
  const [loading, setLoading] = useState(false);

  const addFlavor = () => {
    if (newFlavor.trim() && !flavors.includes(newFlavor.trim())) {
      setFlavors([...flavors, newFlavor.trim()]);
      setNewFlavor("");
    }
  };

  const removeFlavor = (flavor: string) => {
    setFlavors(flavors.filter((f) => f !== flavor));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !category || !price) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("products").insert({
      name,
      description: description || null,
      price: parseFloat(price),
      category,
      stock: parseInt(stock),
      active,
      image_url: imageUrl || null,
      flavors: flavors.length > 0 ? flavors : null,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao cadastrar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso!",
      description: "Produto cadastrado com sucesso",
    });
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Cadastrar Novo Produto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do produto"
                  required
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição do produto"
                  rows={3}
                />
              </div>

              {/* Preço e Categoria */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Estoque */}
              <div className="space-y-2">
                <Label htmlFor="stock">Estoque (-1 = ilimitado)</Label>
                <Input
                  id="stock"
                  type="number"
                  min="-1"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </div>

              {/* Status Ativo */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="active">Produto Ativo</Label>
                  <p className="text-sm text-muted-foreground">
                    Produtos inativos não aparecem no cardápio
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={active}
                  onCheckedChange={setActive}
                />
              </div>

              {/* Imagem */}
              <ImageUpload value={imageUrl} onChange={setImageUrl} />

              {/* Sabores */}
              <div className="space-y-2">
                <Label>Sabores / Opcionais</Label>
                <div className="flex gap-2">
                  <Input
                    value={newFlavor}
                    onChange={(e) => setNewFlavor(e.target.value)}
                    placeholder="Adicionar sabor"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFlavor();
                      }
                    }}
                  />
                  <Button type="button" onClick={addFlavor} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {flavors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {flavors.map((flavor) => (
                      <Badge key={flavor} variant="secondary" className="gap-1">
                        {flavor}
                        <button
                          type="button"
                          onClick={() => removeFlavor(flavor)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Salvando..." : "Cadastrar Produto"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProductForm;
