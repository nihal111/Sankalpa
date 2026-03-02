import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { QuickAddModal } from './QuickAddModal';
import type { List } from '../shared/types';
import './styles.css';

declare global {
  interface Window {
    quickAddApi: {
      getLists: () => Promise<List[]>;
      submit: (data: { title: string; listId: string | null; dueDate: number | null; duration: number | null; notes: string }) => void;
      close: () => void;
    };
  }
}

function QuickAddApp(): React.ReactNode {
  const [lists, setLists] = useState<List[]>([]);

  useEffect(() => {
    window.quickAddApi.getLists().then(setLists);
  }, []);

  return (
    <QuickAddModal
      isOpen={true}
      lists={lists}
      onSubmit={(data) => {
        window.quickAddApi.submit(data);
        window.quickAddApi.close();
      }}
      onClose={() => window.quickAddApi.close()}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QuickAddApp />
  </React.StrictMode>
);
