import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Book, Music, Palette, Film, Coffee, Plane, Heart, Trash2, Edit, Plus, Sparkles, Pen, X } from "lucide-react";
import type { Hobby } from "@shared/schema";
import { insertHobbySchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TitleEntry {
  id: string;
  title: string;
  description: string;
  link: string;
}

const hobbyCategories = [
  { value: "anime", label: "Anime & Manga", icon: Sparkles },
  { value: "books", label: "Books & Reading", icon: Book },
  { value: "music", label: "Music", icon: Music },
  { value: "art", label: "Art & Design", icon: Palette },
  { value: "movies", label: "Movies & TV", icon: Film },
  { value: "dance", label: "Dance", icon: Music },
  { value: "writing", label: "Writing", icon: Pen },
  { value: "cooking", label: "Cooking & Food", icon: Coffee },
  { value: "travel", label: "Travel", icon: Plane },
  { value: "other", label: "Other", icon: Heart },
];

const formSchema = insertHobbySchema.extend({
  title: z.string().optional(),
  category: z.string().min(1, "Category is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface CustomPortfolioProps {
  userId: string;
  isOwn?: boolean;
}

export function CustomPortfolio({ userId, isOwn = false }: CustomPortfolioProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingHobby, setIsAddingHobby] = useState(false);
  const [editingHobby, setEditingHobby] = useState<Hobby | null>(null);
  const [titleEntries, setTitleEntries] = useState<TitleEntry[]>([
    { id: '1', title: '', description: '', link: '' }
  ]);

  const { data: hobbies = [], isLoading } = useQuery<Hobby[]>({
    queryKey: ['/api/users', userId, 'hobbies'],
    enabled: isOpen && !!userId,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: "",
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return await apiRequest('POST', '/api/hobbies', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'hobbies'] });
      form.reset();
      setIsAddingHobby(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormValues> }) => {
      return await apiRequest('PATCH', `/api/hobbies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'hobbies'] });
      form.reset();
      setEditingHobby(null);
      setIsAddingHobby(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/hobbies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'hobbies'] });
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (editingHobby) {
      if (!data.title || !data.title.trim()) {
        form.setError('title', { message: 'Title is required' });
        return;
      }
      updateMutation.mutate({ id: editingHobby.id, data });
    } else {
      const validEntries = titleEntries.filter(entry => entry.title.trim());
      
      if (validEntries.length === 0) {
        return;
      }

      try {
        for (const entry of validEntries) {
          await createMutation.mutateAsync({
            category: data.category,
            title: entry.title.trim(),
            description: entry.description.trim() || undefined,
            link: entry.link.trim() || undefined,
          });
        }
        
        queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'hobbies'] });
        form.reset();
        setTitleEntries([{ id: '1', title: '', description: '', link: '' }]);
        setIsAddingHobby(false);
      } catch (error) {
        console.error('Error creating hobbies:', error);
      }
    }
  };

  const addTitleEntry = () => {
    setTitleEntries([
      ...titleEntries,
      { id: Date.now().toString(), title: '', description: '', link: '' }
    ]);
  };

  const removeTitleEntry = (id: string) => {
    if (titleEntries.length > 1) {
      setTitleEntries(titleEntries.filter(entry => entry.id !== id));
    }
  };

  const updateTitleEntry = (id: string, field: 'title' | 'description' | 'link', value: string) => {
    setTitleEntries(titleEntries.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const handleEdit = (hobby: Hobby) => {
    setEditingHobby(hobby);
    form.reset({
      title: hobby.title,
      category: hobby.category,
      description: hobby.description || "",
    });
    setIsAddingHobby(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCancel = () => {
    form.reset();
    setEditingHobby(null);
    setIsAddingHobby(false);
    setTitleEntries([{ id: '1', title: '', description: '', link: '' }]);
  };

  const handleAddToCategory = (categoryValue: string) => {
    setEditingHobby(null);
    form.reset({
      title: "",
      category: categoryValue,
      description: "",
    });
    setIsAddingHobby(true);
  };

  const groupedHobbies = hobbies.reduce((acc, hobby) => {
    if (!acc[hobby.category]) {
      acc[hobby.category] = [];
    }
    acc[hobby.category].push(hobby);
    return acc;
  }, {} as Record<string, Hobby[]>);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          data-testid="button-view-custom-portfolio"
        >
          <Sparkles className="h-4 w-4" />
          {isOwn ? "Edit Custom Portfolio" : "View Custom Portfolio"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-full sm:max-w-3xl lg:max-w-5xl h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Custom Portfolio & Interests
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {isOwn && (
              <div className="flex justify-end">
                <Button
                  onClick={() => setIsAddingHobby(!isAddingHobby)}
                  variant={isAddingHobby ? "outline" : "default"}
                  className="gap-2"
                  data-testid="button-add-interest"
                >
                  {isAddingHobby ? (
                    <>Cancel</>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Interest
                    </>
                  )}
                </Button>
              </div>
            )}

            {isAddingHobby && isOwn && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {editingHobby ? "Edit Interest" : "Add New Interest"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-category">
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {hobbyCategories.map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {editingHobby ? (
                        <>
                          <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g., One Piece, Harry Potter, Swing Dancing"
                                    {...field}
                                    data-testid="input-title"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Share more about this interest..."
                                    {...field}
                                    value={field.value || ""}
                                    data-testid="input-description"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <FormLabel>Titles</FormLabel>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addTitleEntry}
                              className="gap-1"
                              data-testid="button-add-title"
                            >
                              <Plus className="h-4 w-4" />
                              Add Title
                            </Button>
                          </div>
                          {titleEntries.map((entry, index) => (
                            <Card key={entry.id} className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-start gap-2">
                                  <div className="flex-1">
                                    <FormLabel>Title {index + 1}</FormLabel>
                                    <Input
                                      placeholder="e.g., One Piece, Harry Potter, Swing Dancing"
                                      value={entry.title}
                                      onChange={(e) => updateTitleEntry(entry.id, 'title', e.target.value)}
                                      data-testid={`input-title-${index}`}
                                      className="mt-2"
                                    />
                                  </div>
                                  {titleEntries.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeTitleEntry(entry.id)}
                                      data-testid={`button-remove-title-${index}`}
                                      className="mt-6"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                                <div>
                                  <FormLabel>Description (Optional)</FormLabel>
                                  <Textarea
                                    placeholder="Share more about this interest..."
                                    value={entry.description}
                                    onChange={(e) => updateTitleEntry(entry.id, 'description', e.target.value)}
                                    data-testid={`input-description-${index}`}
                                    className="mt-2"
                                  />
                                </div>
                                <div>
                                  <FormLabel>Link (Optional)</FormLabel>
                                  <Input
                                    type="url"
                                    placeholder="https://example.com/your-content"
                                    value={entry.link}
                                    onChange={(e) => updateTitleEntry(entry.id, 'link', e.target.value)}
                                    data-testid={`input-link-${index}`}
                                    className="mt-2"
                                  />
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}

                      {editingHobby && (
                        <FormField
                          control={form.control}
                          name="link"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Link (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  type="url"
                                  placeholder="https://example.com/your-content"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-link"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={createMutation.isPending || updateMutation.isPending}
                          data-testid="button-save-interest"
                        >
                          {editingHobby ? "Update" : "Add"} Interest
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancel}
                          data-testid="button-cancel-interest"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading interests...
              </div>
            ) : hobbies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isOwn 
                  ? "No interests added yet. Add your first interest to get started!"
                  : "This user hasn't added any interests yet."}
              </div>
            ) : (
              <div className="space-y-6">
                {hobbyCategories.map((category) => {
                  const categoryHobbies = groupedHobbies[category.value];
                  if (!categoryHobbies || categoryHobbies.length === 0) return null;

                  const Icon = category.icon;
                  
                  return (
                    <div key={category.value}>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">{category.label}</h3>
                        <Badge variant="secondary">{categoryHobbies.length}</Badge>
                        {isOwn && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 ml-auto"
                            onClick={() => handleAddToCategory(category.value)}
                            data-testid={`button-add-to-${category.value}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Separator className="mb-3" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryHobbies.map((hobby) => (
                          <Card key={hobby.id} data-testid={`card-hobby-${hobby.id}`}>
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold mb-1" data-testid={`text-hobby-title-${hobby.id}`}>
                                    {hobby.title}
                                  </h4>
                                  {hobby.description && (
                                    <p className="text-sm text-muted-foreground mb-2" data-testid={`text-hobby-description-${hobby.id}`}>
                                      {hobby.description}
                                    </p>
                                  )}
                                  {hobby.link && (
                                    <a
                                      href={hobby.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                      data-testid={`link-hobby-${hobby.id}`}
                                    >
                                      View Link →
                                    </a>
                                  )}
                                </div>
                                {isOwn && (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEdit(hobby)}
                                      data-testid={`button-edit-hobby-${hobby.id}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDelete(hobby.id)}
                                      data-testid={`button-delete-hobby-${hobby.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
