import React from 'react';
import KanbanBoard from './KanbanBoard'; 
// import {KanbanProvider} from './KanbanBoard';

function App() {
  return (
    <div>
      <h1 style={{ textAlign: 'center' }}>Kanban Board</h1>
      <KanbanBoard />
    </div>
  );
}

export default App;
