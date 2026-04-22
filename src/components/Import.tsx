'use client';
import {FC, useState, useMemo} from 'react';
import {useDropzone} from 'react-dropzone';
import {parseCsv, parseOpml, parseJsonMindmap} from '../utils/csvUtils';
import {createMindmap, createMindmapFromNode} from '../utils/mindmapUtils';

const dropzoneStyles = {
  display: 'flex',
  height: '100%',
  flexDirection: 'column',
  justifyContent: 'center',
  textAlign: 'center',
  border: '3px dashed rgba(41, 128, 185, 0.5)',
  color: 'rgba(41, 128, 185, 1.0)',
  fontWeight: 'bold',
  fontSize: '1.2em',
  padding: '20px',
  borderRadius: '8px',
  minHeight: '200px',
} as const;

export const Import: FC<{ creditsDisabled?: boolean; onImportSuccess?: () => void }> = ({ creditsDisabled = false, onImportSuccess }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const dropzone = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'text/x-opml': ['.opml'],
      'application/xml': ['.opml'],
      'text/xml': ['.opml'],
      'application/json': ['.json'],
    },
    maxFiles: 1,
    onDrop: (droppedFiles: File[]) => {
      setFiles([droppedFiles[0]]);
      setError('');
      setSuccess('');
    },
  });

  const handleCreate = async () => {
    if (creditsDisabled) {
      setError('You have no credits remaining. Please upgrade your plan.');
      return;
    }
    setIsCreating(true);
    setError('');
    setSuccess('');
    
    const failed = [];
    for (const file of files) {
      try {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'opml') {
          const node = await parseOpml(file);
          await createMindmapFromNode(node);
        } else if (ext === 'json') {
          const node = await parseJsonMindmap(file);
          await createMindmapFromNode(node);
        } else {
          const contents = await parseCsv(file);
          await createMindmap(contents);
        }
        setSuccess(`Mind map created successfully from ${file.name}`);
        if (onImportSuccess) onImportSuccess();
      } catch (e) {
        failed.push(file);
        console.error(e);
        setError(`Failed to create mind map from ${file.name}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    setFiles([]);
    setIsCreating(false);
  };

  const style = useMemo(() => {
    let borderColor = 'rgba(41, 128, 185, 0.5)';
    if (dropzone.isDragAccept) {
      borderColor = 'rgba(41, 128, 185, 1.0)';
    }

    if (dropzone.isDragReject) {
      borderColor = 'rgba(192, 57, 43, 1.0)';
    }
    return {
      ...dropzoneStyles,
      borderColor,
    };
  }, [dropzone.isDragActive, dropzone.isDragReject]);

  return (
    <div style={{padding: '20px'}}>
      <h2>Import Mind Map</h2>
      {creditsDisabled && (
        <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', marginBottom: '16px', borderRadius: '4px', border: '1px solid #f5c6cb', fontWeight: 600 }}>
          🚫 You have no credits remaining. Upgrade your plan to continue importing.
        </div>
      )}
      <p style={{marginBottom: '20px', fontSize: '14px', color: '#666'}}>
        Select a CSV, OPML, or JSON file to import it as a mind map
      </p>

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          marginBottom: '20px',
          borderRadius: '4px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '10px',
          backgroundColor: '#d4edda',
          color: '#155724',
          marginBottom: '20px',
          borderRadius: '4px',
          border: '1px solid #c3e6cb'
        }}>
          {success}
        </div>
      )}

      <div {...(!creditsDisabled ? dropzone.getRootProps({style}) : {})} style={{
        ...style,
        opacity: creditsDisabled ? 0.5 : 1,
        cursor: creditsDisabled ? 'not-allowed' : 'pointer',
        pointerEvents: creditsDisabled ? 'none' : 'auto',
      }}>
        <input {...(!creditsDisabled ? dropzone.getInputProps() : {})} disabled={creditsDisabled} />
        {dropzone.isDragAccept ? (
          <p style={{margin: 0}}>Drop your file here</p>
        ) : (
          <>
            <div>
              <button
                type="button"
                className="button button-primary button-small"
                style={{marginBottom: '10px'}}
                disabled={creditsDisabled}
              >
                Select file
              </button>
              <p style={{margin: 0}}>Or drop your CSV, OPML, or JSON file here</p>
            </div>
          </>
        )}
      </div>

      {files.length > 0 && (
        <>
          <ul style={{
            listStyle: 'none',
            padding: '10px',
            backgroundColor: '#f8f9fa',
            margin: '20px 0',
            borderRadius: '4px'
          }}>
            {files.map((file, i) => (
              <li key={i}>{file.name}</li>
            ))}
          </ul>

          <button
            onClick={handleCreate}
            className="button button-primary"
            disabled={isCreating || creditsDisabled}
            style={{width: '100%'}}
          >
            {isCreating ? 'Creating Mind Map...' : 'Create Mind Map'}
          </button>
        </>
      )}

      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        fontSize: '13px'
      }}>
        <h4 style={{marginTop: 0}}>Supported Formats:</h4>

        <p><strong>CSV</strong> — each row is a path from root to child:</p>
        <pre style={{backgroundColor: 'white', padding: '10px', borderRadius: '4px', overflow: 'auto'}}>
{`Root,Category 1,Item 1
Root,Category 1,Item 2
Root,Category 2,Item 3`}
        </pre>

        <p><strong>OPML</strong> — standard outline XML (e.g. exported from mind map tools):</p>
        <pre style={{backgroundColor: 'white', padding: '10px', borderRadius: '4px', overflow: 'auto'}}>
{`<opml version="2.0">
  <body>
    <outline text="Root">
      <outline text="Category 1">
        <outline text="Item 1"/>
      </outline>
    </outline>
  </body>
</opml>`}
        </pre>

        <p><strong>JSON</strong> — nested tree with <code>text</code> and <code>children</code>:</p>
        <pre style={{backgroundColor: 'white', padding: '10px', borderRadius: '4px', overflow: 'auto'}}>
{`{
  "text": "Root",
  "children": [
    {
      "text": "Category 1",
      "children": [
        { "text": "Item 1" }
      ]
    }
  ]
}`}
        </pre>
      </div>
    </div>
  );
};
