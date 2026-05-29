import { useState, FormEvent } from 'react';
import { Link as LinkIcon, Type, Tag, Calendar, Lock, Hash, ExternalLink } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useCreateLink } from '@/hooks/useLinks';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateLinkModal({ isOpen, onClose }: CreateLinkModalProps) {
  const createLink = useCreateLink();
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!originalUrl) return;

    const data: any = { originalUrl };
    if (customAlias) data.shortCode = customAlias;
    if (title) data.title = title;
    if (tags) data.tags = tags.split(',').map((t) => t.trim());
    if (expiresAt) data.expiresAt = new Date(expiresAt).toISOString();
    if (hasPassword && password) data.password = password;

    try {
      await createLink.mutateAsync(data);
      handleClose();
    } catch {}
  };

  const handleClose = () => {
    setOriginalUrl('');
    setCustomAlias('');
    setTitle('');
    setTags('');
    setExpiresAt('');
    setPassword('');
    setHasPassword(false);
    onClose();
  };

  const previewUrl = customAlias
    ? `${window.location.origin}/${customAlias}`
    : `${window.location.origin}/[auto-generated]`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Short Link"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={createLink.isLoading}>
            <LinkIcon className="w-4 h-4" />
            Create Link
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Destination URL *"
          icon={<LinkIcon className="w-4 h-4" />}
          type="url"
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          placeholder="https://example.com/very/long/url"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Custom Alias (optional)"
            icon={<Hash className="w-4 h-4" />}
            value={customAlias}
            onChange={(e) => setCustomAlias(e.target.value)}
            placeholder="my-custom-link"
          />
          <Input
            label="Title (optional)"
            icon={<Type className="w-4 h-4" />}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Campaign"
          />
        </div>

        <Input
          label="Tags (optional, comma separated)"
          icon={<Tag className="w-4 h-4" />}
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="marketing, campaign, social"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Expiry Date (optional)"
            icon={<Calendar className="w-4 h-4" />}
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-secondary-700 dark:text-secondary-300">
              <input
                type="checkbox"
                checked={hasPassword}
                onChange={(e) => setHasPassword(e.target.checked)}
                className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
              />
              Password Protection
            </label>
            {hasPassword && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set a password"
                  className="input-field pl-10"
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-secondary-50 dark:bg-secondary-900/50 rounded-lg p-3 border border-secondary-200 dark:border-secondary-700">
          <p className="text-xs font-medium text-secondary-500 mb-1">Short URL Preview</p>
          <div className="flex items-center gap-2 text-sm">
            <ExternalLink className="w-4 h-4 text-primary-500" />
            <span className="text-primary-600 dark:text-primary-400 font-medium break-all">{previewUrl}</span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
