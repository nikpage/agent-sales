// pages/edit-proposal/[id].tsx

import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { verifySignature } from '../../lib/security';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface Props {
  proposal: {
    id: string;
    draft_subject: string;
    draft_body_text: string;
    action_type: string;
  };
  error?: string;
}

export default function EditProposal({ proposal, error }: Props) {
  const [subject, setSubject] = useState(proposal?.draft_subject || '');
  const [body, setBody] = useState(proposal?.draft_body_text || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F7F5F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          background: '#FFFFFF',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 6px 20px rgba(27,38,59,0.08)',
          maxWidth: '500px'
        }}>
          <h1 style={{ color: '#23476B', marginTop: 0 }}>Error</h1>
          <p style={{ color: '#666' }}>{error}</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/update-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: proposal.id,
          draft_subject: subject,
          draft_body_text: body
        })
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F5F0',
      padding: '24px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 6px 20px rgba(27,38,59,0.08)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px 22px',
          borderBottom: '1px solid rgba(27,38,59,0.08)',
          background: '#F7F5F0'
        }}>
          <div style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: '#23476B'
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              Mila
              <span style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                background: '#A89273',
                borderRadius: '2px',
                transform: 'rotate(45deg)'
              }}></span>
            </div>
            <div style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: '#A89273',
              marginTop: '2px'
            }}>
              Executive Assistant
            </div>
          </div>
        </div>

        <div style={{ padding: '32px' }}>
          <h1 style={{
            color: '#23476B',
            marginTop: 0,
            fontSize: '24px',
            marginBottom: '24px'
          }}>
            Upravit návrh
          </h1>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              color: '#23476B',
              fontWeight: 600,
              marginBottom: '8px'
            }}>
              Předmět
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid rgba(35,71,107,0.2)',
                borderRadius: '6px',
                fontSize: '15px',
                fontFamily: 'Arial, sans-serif',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              color: '#23476B',
              fontWeight: 600,
              marginBottom: '8px'
            }}>
              Text emailu
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid rgba(35,71,107,0.2)',
                borderRadius: '6px',
                fontSize: '15px',
                fontFamily: 'Arial, sans-serif',
                lineHeight: 1.5,
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: '#A89273',
                color: '#FFFFFF',
                padding: '12px 24px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '15px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {saving ? 'Ukládám...' : 'Uložit změny'}
            </button>

            {saved && (
              <span style={{ color: '#A89273', fontSize: '14px' }}>
                ✓ Uloženo
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params!;
  const { sig, ...params } = context.query;

  if (!verifySignature(context.query)) {
    return {
      props: {
        error: 'Invalid signature',
        proposal: null
      }
    };
  }

  const { data: proposal, error } = await supabase
    .from('action_proposals')
    .select('id, draft_subject, draft_body_text, action_type, user_id')
    .eq('id', id)
    .single();

  if (error || !proposal) {
    return {
      props: {
        error: 'Proposal not found',
        proposal: null
      }
    };
  }

  return {
    props: {
      proposal: {
        id: proposal.id,
        draft_subject: proposal.draft_subject,
        draft_body_text: proposal.draft_body_text,
        action_type: proposal.action_type
      }
    }
  };
};
