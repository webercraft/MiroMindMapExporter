'use client';
import {FC, useState, useMemo} from 'react';
import {useDropzone} from 'react-dropzone';
import {parseCsv} from '../utils/csvUtils';
import {createMindmap} from '../utils/mindmapUtils';

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
        const contents = await parseCsv(file);
        await createMindmap(contents);
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
      <h2>Import Mind Map from CSV</h2>
      {creditsDisabled && (
        <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', marginBottom: '16px', borderRadius: '4px', border: '1px solid #f5c6cb', fontWeight: 600 }}>
          🚫 You have no credits remaining. Upgrade your plan to continue importing.
        </div>
      )}
      <p style={{marginBottom: '20px', fontSize: '14px', color: '#666'}}>
        Select your CSV file to import it as a mind map
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
          <p style={{margin: 0}}>Drop your CSV file here</p>
        ) : (
          <>
            <div>
              <button
                type="button"
                className="button button-primary button-small"
                style={{marginBottom: '10px'}}
                disabled={creditsDisabled}
              >
                Select CSV file
              </button>
              <p style={{margin: 0}}>Or drop your CSV file here</p>
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
        <h4 style={{marginTop: 0}}>CSV Format Example:</h4>
        <p>Each row represents a path from root to child node:</p>
        <pre style={{
          backgroundColor: 'white',
          padding: '10px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`Root,Category 1,Item 1
Root,Category 1,Item 2
Root,Category 2,Item 3
Root,Category 2,Item 4`}
        </pre>
      </div>
    </div>
  );
};
