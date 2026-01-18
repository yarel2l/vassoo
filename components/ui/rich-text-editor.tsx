'use client'

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Code,
    List,
    ListOrdered,
    Quote,
    Undo,
    Redo,
    Link as LinkIcon,
    Unlink,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Heading1,
    Heading2,
    Heading3,
    Minus,
    Pilcrow
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
    content: string
    onChange: (content: string) => void
    placeholder?: string
    className?: string
    editorClassName?: string
}

const MenuButton = ({
    onClick,
    isActive = false,
    disabled = false,
    children,
    title
}: {
    onClick: () => void
    isActive?: boolean
    disabled?: boolean
    children: React.ReactNode
    title?: string
}) => (
    <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
            'h-8 w-8 p-0',
            isActive && 'bg-neutral-700 text-white'
        )}
    >
        {children}
    </Button>
)

const MenuBar = ({ editor }: { editor: Editor | null }) => {
    const setLink = useCallback(() => {
        if (!editor) return

        const previousUrl = editor.getAttributes('link').href
        const url = window.prompt('URL', previousUrl)

        if (url === null) return

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            return
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }, [editor])

    if (!editor) return null

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-neutral-700 bg-neutral-800 rounded-t-lg">
            {/* Text formatting */}
            <MenuButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Bold"
            >
                <Bold className="h-4 w-4" />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Italic"
            >
                <Italic className="h-4 w-4" />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                isActive={editor.isActive('underline')}
                title="Underline"
            >
                <UnderlineIcon className="h-4 w-4" />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                title="Strikethrough"
            >
                <Strikethrough className="h-4 w-4" />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleCode().run()}
                isActive={editor.isActive('code')}
                title="Inline Code"
            >
                <Code className="h-4 w-4" />
            </MenuButton>

            <Separator orientation="vertical" className="h-6 mx-1 bg-neutral-600" />

            {/* Headings */}
            <MenuButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                title="Heading 1"
            >
                <Heading1 className="h-4 w-4" />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
            >
                <Heading2 className="h-4 w-4" />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
            >
                <Heading3 className="h-4 w-4" />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().setParagraph().run()}
                isActive={editor.isActive('paragraph')}
                title="Paragraph"
            >
                <Pilcrow className="h-4 w-4" />
            </MenuButton>

            <Separator orientation="vertical" className="h-6 mx-1 bg-neutral-600" />

            {/* Lists */}
            <MenuButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="Bullet List"
            >
                <List className="h-4 w-4" />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="Numbered List"
            >
                <ListOrdered className="h-4 w-4" />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="Blockquote"
            >
                <Quote className="h-4 w-4" />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Horizontal Rule"
            >
                <Minus className="h-4 w-4" />
            </MenuButton>

            <Separator orientation="vertical" className="h-6 mx-1 bg-neutral-600" />

            {/* Alignment */}
            <MenuButton
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                isActive={editor.isActive({ textAlign: 'left' })}
                title="Align Left"
            >
                <AlignLeft className="h-4 w-4" />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                isActive={editor.isActive({ textAlign: 'center' })}
                title="Align Center"
            >
                <AlignCenter className="h-4 w-4" />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                isActive={editor.isActive({ textAlign: 'right' })}
                title="Align Right"
            >
                <AlignRight className="h-4 w-4" />
            </MenuButton>

            <Separator orientation="vertical" className="h-6 mx-1 bg-neutral-600" />

            {/* Links */}
            <MenuButton
                onClick={setLink}
                isActive={editor.isActive('link')}
                title="Add Link"
            >
                <LinkIcon className="h-4 w-4" />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().unsetLink().run()}
                disabled={!editor.isActive('link')}
                title="Remove Link"
            >
                <Unlink className="h-4 w-4" />
            </MenuButton>

            <Separator orientation="vertical" className="h-6 mx-1 bg-neutral-600" />

            {/* Undo/Redo */}
            <MenuButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="Undo"
            >
                <Undo className="h-4 w-4" />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="Redo"
            >
                <Redo className="h-4 w-4" />
            </MenuButton>
        </div>
    )
}

export function RichTextEditor({
    content,
    onChange,
    placeholder = 'Start writing...',
    className,
    editorClassName
}: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3]
                }
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-500 underline cursor-pointer'
                }
            }),
            Placeholder.configure({
                placeholder
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph']
            }),
            Underline.configure({
                HTMLAttributes: {
                    class: 'underline'
                }
            })
        ],
        content,
        editorProps: {
            attributes: {
                class: cn(
                    'prose prose-invert max-w-none min-h-[300px] p-4 focus:outline-none',
                    'prose-headings:text-white prose-p:text-neutral-300',
                    'prose-strong:text-white prose-em:text-neutral-300',
                    'prose-ul:text-neutral-300 prose-ol:text-neutral-300',
                    'prose-blockquote:text-neutral-400 prose-blockquote:border-neutral-600',
                    'prose-code:text-orange-400 prose-code:bg-neutral-800 prose-code:px-1 prose-code:rounded',
                    'prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline',
                    editorClassName
                )
            }
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        }
    })

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content)
        }
    }, [content, editor])

    return (
        <div className={cn('border border-neutral-700 rounded-lg overflow-hidden', className)}>
            <MenuBar editor={editor} />
            <div className="bg-neutral-900">
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}

export default RichTextEditor
