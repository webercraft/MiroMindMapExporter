'use client';
import {FC, useState, useEffect} from 'react';
import {Export} from './Export';
import {Import} from './Import';
import {Upgrade} from './Upgrade';
import {fetchApi} from '../utils/fetchApi';

type Tab = 'export' | 'import';

export const MindMapManager: FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('export');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [usedCredits, setUsedCredits] = useState<number | null>(null);
  const [totalCredits, setTotalCredits] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [hasPaid, setHasPaid] = useState(false);

  const fetchCredits = async () => {
    try {
      const res = await fetchApi('/api/recent');
      const data = await res.json();
      setUsedCredits(data.used_credits ?? 0);
      setTotalCredits(data.total_credits ?? 0);
      setHasPaid(!!(data.record?.[0]?.hasPaid));
    } catch (e) {
      console.error('Failed to fetch credits:', e);
    } finally {
      setCreditsLoading(false);
    }
  };

  const deductCredit = async () => {
    try {
      const res = await fetchApi('/api/recent', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setUsedCredits(data.used_credits);
        setTotalCredits(data.total_credits);
      }
    } catch (e) {
      console.error('Failed to deduct credit:', e);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const noCredits = usedCredits !== null && usedCredits <= 0;

  // Credit bar color
  const creditRatio = totalCredits ? (usedCredits ?? 0) / totalCredits : 0;
  const barColor = creditRatio > 0.5 ? '#28a745' : creditRatio > 0.2 ? '#ffc107' : '#dc3545';

  return (
    <div style={{height: '100vh', display: 'flex', flexDirection: 'column'}}>
      {/* Credits Bar */}
      <div style={{
        padding: '10px 16px',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{fontSize: '13px', fontWeight: 600, color: '#333', whiteSpace: 'nowrap'}}>
          Credits:
        </span>
        {creditsLoading ? (
          <span style={{fontSize: '13px', color: '#888'}}>Loading...</span>
        ) : (
          <>
            <div style={{flex: 1, backgroundColor: '#e0e0e0', borderRadius: '4px', height: '8px', overflow: 'hidden'}}>
              <div style={{
                width: `${Math.min(100, creditRatio * 100)}%`,
                backgroundColor: barColor,
                height: '100%',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{fontSize: '13px', fontWeight: 600, color: noCredits ? '#dc3545' : '#333', whiteSpace: 'nowrap'}}>
              {usedCredits} / {totalCredits}
            </span>
            {noCredits && (
              <span style={{fontSize: '12px', color: '#dc3545', fontWeight: 600}}>No credits left</span>
            )}
            <button
              onClick={() => setShowUpgrade(true)}
              style={{
                padding: '5px 12px',
                backgroundColor: hasPaid ? '#6c757d' : '#4262ff',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {hasPaid ? '⚙ Settings' : 'Upgrade Now'}
            </button>
          </>
        )}
      </div>

      {/* Upgrade Page Overlay */}
      {showUpgrade ? (
        <div style={{flex: 1, overflow: 'auto'}}>
          <Upgrade onBack={() => setShowUpgrade(false)} hasPaid={hasPaid} />
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '2px solid #e0e0e0',
            backgroundColor: '#f8f9fa'
          }}>
            <button
              onClick={() => setActiveTab('export')}
              style={{
                flex: 1,
                padding: '16px',
                border: 'none',
                backgroundColor: activeTab === 'export' ? '#ffffff' : 'transparent',
                borderBottom: activeTab === 'export' ? '3px solid #4262ff' : '3px solid transparent',
                color: activeTab === 'export' ? '#4262ff' : '#6c757d',
                fontWeight: activeTab === 'export' ? 'bold' : 'normal',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease',
              }}
            >
              Export Mind Map
            </button>
            <button
              onClick={() => setActiveTab('import')}
              style={{
                flex: 1,
                padding: '16px',
                border: 'none',
                backgroundColor: activeTab === 'import' ? '#ffffff' : 'transparent',
                borderBottom: activeTab === 'import' ? '3px solid #4262ff' : '3px solid transparent',
                color: activeTab === 'import' ? '#4262ff' : '#6c757d',
                fontWeight: activeTab === 'import' ? 'bold' : 'normal',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease',
              }}
            >
              Import Mind Map
            </button>
          </div>

          {/* Tab Content */}
          <div style={{flex: 1, overflow: 'auto', padding: '0'}}>
            {activeTab === 'export' && <Export creditsDisabled={noCredits} onExportSuccess={deductCredit} />}
            {activeTab === 'import' && <Import creditsDisabled={noCredits} onImportSuccess={deductCredit} />}
          </div>
        </>
      )}
    </div>
  );
};
