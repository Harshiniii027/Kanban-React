import React, { useState, useEffect, createContext, useMemo, useReducer, useContext, useRef } from 'react';
import './KanbanBoard.css';
import './ConfirmDeleteModal.css';

const KanbanContext = createContext();

const initialState = {
  todo: [
    { id: '2', text: 'Task B' },
    { id: '3', text: 'Task C' },
  ],
  inProgress: [
    { id: '1', text: 'Task A' },
  ],
  done: []
};

function kanbanReducer(state, action) {
  switch (action.type) {
    case 'MOVE_CARD': {
      const { card, from, to } = action.payload;
      if (from === to) return state;
      return {
        ...state,
        [from]: state[from].filter(c => c.id !== card.id),
        [to]: state[to].some(c => c.id === card.id) ? state[to] : [...state[to], card],
      };
    }
    case 'ADD_TASK': {
      const newTask = {
        id: Date.now().toString(),
        text: action.payload.text
      };
      return {
        ...state,
        todo: [...state.todo, newTask]
      };
    }
    case 'EDIT_CARD': {
      const { cardId, from, newText } = action.payload;
      return {
        ...state,
        [from]: state[from].map(card =>
          card.id === cardId ? { ...card, text: newText } : card
        )
      };
    }
    case 'DELETE_CARD': {
      const { cardId, from } = action.payload;
      return {
        ...state,
        [from]: state[from].filter(c => c.id !== cardId),
      };
    }
    case 'REORDER_CARD': {
      const { column, fromIndex, toIndex } = action.payload;
      const updatedColumn = [...state[column]];
      const [movedCard] = updatedColumn.splice(fromIndex, 1);
      updatedColumn.splice(toIndex, 0, movedCard);
      return {
        ...state,
        [column]: updatedColumn
      };
    }
    default:
      return state;
  }
}

function KanbanProvider({ children }) {
  const [state, dispatch] = useReducer(kanbanReducer, initialState);
  const draggedCardRef = useRef(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const value = useMemo(
    () => ({ state, dispatch, draggedCardRef, pendingDelete, setPendingDelete }),
    [state, pendingDelete]
  );

  return (
    <KanbanContext.Provider value={value}>
      {children}
    </KanbanContext.Provider>
  );
}

function Column({ title, columnKey, className = '' }) {
  const { state, dispatch, draggedCardRef } = useContext(KanbanContext);
  const dropRef = useRef(null);

  useEffect(() => {
    const dropArea = dropRef.current;
    const handleDrop = e => {
      e.preventDefault();
      const dragged = draggedCardRef.current;
      if (!dragged) return;
      dispatch({ type: 'MOVE_CARD', payload: { card: dragged.card, from: dragged.from, to: columnKey } });
      draggedCardRef.current = null;
    };
    const handleDragOver = e => e.preventDefault();

    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('drop', handleDrop);

    return () => {
      dropArea.removeEventListener('dragover', handleDragOver);
      dropArea.removeEventListener('drop', handleDrop);
    };
  }, [dispatch, columnKey, draggedCardRef]);

  return (
    <div className={`column ${className}`} ref={dropRef}>
      <h2>{title}</h2>
      {state[columnKey].map((card, index) => (
        <Card
          key={card.id}
          card={card}
          from={columnKey}
          index={index}
          moveCard={(fromIndex, toIndex) =>
            dispatch({ type: 'REORDER_CARD', payload: { column: columnKey, fromIndex, toIndex } })
          }
        />
      ))}
    </div>
  );
}

function TrashDropZone() {
  const { draggedCardRef, setPendingDelete } = useContext(KanbanContext);
  const dropRef = useRef(null);

  useEffect(() => {
    const dropArea = dropRef.current;

    const handleDrop = (e) => {
      e.preventDefault();
      const data = draggedCardRef.current;
      if (!data) return;
      setPendingDelete(data);
      draggedCardRef.current = null;
    };

    const handleDragOver = e => e.preventDefault();

    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('drop', handleDrop);

    return () => {
      dropArea.removeEventListener('dragover', handleDragOver);
      dropArea.removeEventListener('drop', handleDrop);
    };
  }, [draggedCardRef, setPendingDelete]);

  return (
    <div ref={dropRef} className="trash-zone">
      <span>Drop Here To Delete</span>
    </div>
  );
}

function TaskInput() {
  const { dispatch } = useContext(KanbanContext);
  const [text, setText] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    if (!text.trim()) return;
    dispatch({ type: 'ADD_TASK', payload: { text } });
    setText('');
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Add new Task"
      />
      <button type="submit">Add</button>
    </form>
  );
}

function Card({ card, from, index, moveCard }) {
  const dragRef = useRef(null);
  const { dispatch, draggedCardRef } = useContext(KanbanContext);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(card.text);

  const handleDragStart = () => {
    if (!isEditing) {
      draggedCardRef.current = { card, from, index };
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    const dragged = draggedCardRef.current;
    if (dragged && dragged.from === from && dragged.index !== index) {
      moveCard(dragged.index, index);
      dragged.index = index;
      draggedCardRef.current = dragged;
    }
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    if (editedText.trim() && editedText !== card.text) {
      dispatch({ type: 'EDIT_CARD', payload: { cardId: card.id, from, newText: editedText } });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  };

  return (
    <div
      className="card"
      ref={dragRef}
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <input
          className="card-edit-input"
          autoFocus
          value={editedText}
          onChange={e => setEditedText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      ) : (
        card.text
      )}
    </div>
  );
}

function ConfirmDeleteModal() {
  const { pendingDelete, setPendingDelete, dispatch } = useContext(KanbanContext);

  if (!pendingDelete) return null;

  const { card, from } = pendingDelete;

  const confirmDelete = () => {
    dispatch({ type: 'DELETE_CARD', payload: { cardId: card.id, from } });
    setPendingDelete(null);
  };

  const cancelDelete = () => {
    setPendingDelete(null);
  };

  return (
    <div className="confirm-modal">
      <div className="confirm-content">
        <p>Are you sure you want to delete "{card.text}"?</p>
        <div className="confirm-buttons">
          <button onClick={confirmDelete}>Confirm</button>
          <button onClick={cancelDelete}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const KanbanBoard = () => {
  return (
    <KanbanProvider>
      <div className="board-container">
        <TaskInput />
        <div className="board">
          <Column title="To Do" columnKey="todo" className="column-red" />
          <Column title="In Progress" columnKey="inProgress" className="column-yellow" />
          <Column title="Done" columnKey="done" className="column-green" />
        </div>
        <TrashDropZone />
        <ConfirmDeleteModal />
      </div>
    </KanbanProvider>
  );
};

export default KanbanBoard;
