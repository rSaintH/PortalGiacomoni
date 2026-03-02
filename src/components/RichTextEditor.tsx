import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  ImagePlus,
  Undo,
  Redo,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadPopImage } from "@/services/pops.service";

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder }: Props) {
  const { toast } = useToast();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: "rounded-md max-w-full my-2",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[500px] p-3 focus:outline-none [&_img]:max-w-full [&_img]:rounded-md [&_img]:my-2",
        style: "background-color: #ffffff; color: #000000;",
      },
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const files = Array.from(event.dataTransfer.files).filter((f) =>
            f.type.startsWith("image/")
          );
          if (files.length) {
            event.preventDefault();
            files.forEach((file) => uploadAndInsert(file));
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) uploadAndInsert(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  const uploadAndInsert = useCallback(
    async (file: File) => {
      if (!editor) return;
      try {
        const publicUrl = await uploadPopImage(file);
        editor.chain().focus().setImage({ src: publicUrl }).run();
      } catch (error: any) {
        toast({
          title: "Erro no upload",
          description: error.message || "Nao foi possivel enviar a imagem.",
          variant: "destructive",
        });
      }
    },
    [editor, toast]
  );

  const handleImageButton = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = () => {
      if (input.files) {
        Array.from(input.files).forEach((f) => uploadAndInsert(f));
      }
    };
    input.click();
  }, [uploadAndInsert]);

  if (!editor) return null;

  return (
    <div className="border border-input rounded-md overflow-hidden" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/30 p-1">
        <ToolBtn
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          icon={<Bold className="h-4 w-4" />}
          title="Negrito"
        />
        <ToolBtn
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          icon={<Italic className="h-4 w-4" />}
          title="Itálico"
        />
        <ToolBtn
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          icon={<Heading2 className="h-4 w-4" />}
          title="Título"
        />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolBtn
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          icon={<List className="h-4 w-4" />}
          title="Lista"
        />
        <ToolBtn
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          icon={<ListOrdered className="h-4 w-4" />}
          title="Lista numerada"
        />
        <ToolBtn
          active={false}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          icon={<Minus className="h-4 w-4" />}
          title="Linha horizontal"
        />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolBtn
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          icon={<AlignLeft className="h-4 w-4" />}
          title="Alinhar à esquerda"
        />
        <ToolBtn
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          icon={<AlignCenter className="h-4 w-4" />}
          title="Centralizar"
        />
        <ToolBtn
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          icon={<AlignRight className="h-4 w-4" />}
          title="Alinhar à direita"
        />
        <ToolBtn
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          icon={<AlignJustify className="h-4 w-4" />}
          title="Justificar"
        />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolBtn
          active={false}
          onClick={handleImageButton}
          icon={<ImagePlus className="h-4 w-4" />}
          title="Inserir imagem"
        />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolBtn
          active={false}
          onClick={() => editor.chain().focus().undo().run()}
          icon={<Undo className="h-4 w-4" />}
          title="Desfazer"
        />
        <ToolBtn
          active={false}
          onClick={() => editor.chain().focus().redo().run()}
          icon={<Redo className="h-4 w-4" />}
          title="Refazer"
        />
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

function ToolBtn({
  active,
  onClick,
  icon,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="h-7 w-7"
      onClick={onClick}
      title={title}
    >
      {icon}
    </Button>
  );
}
