import React, { useEffect, useState, useRef } from 'react';
import { UserWarning } from './UserWarning';
import {
  USER_ID,
  getTodos,
  addTodo,
  deleteTodo,
  updateTodo,
} from './api/todos';
import { Todo } from './types/Todo';
import { NewTodoForm, ToggleAllButton } from './components/Header';
import {
  ClearCompletedButton,
  TodosCounter,
  TodosFilter,
} from './components/Footer';
import { TodoStatus, ErrorMessages } from './constants';
import { TodoList } from './components/TodoList';
import { ErrorNotification } from './components/ErrorNotification';

function getFilteredTodos(todos: Todo[], filter: TodoStatus): Todo[] {
  switch (filter) {
    case TodoStatus.Active:
      return todos.filter(todo => !todo.completed);
    case TodoStatus.Completed:
      return todos.filter(todo => todo.completed);
    case TodoStatus.All:
    default:
      return [...todos];
  }
}

function getActiveTodosCount(todos: Todo[]): number {
  return todos.filter(todo => !todo.completed).length;
}

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [filter, setFilter] = useState<TodoStatus>(TodoStatus.All);

  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const [loadingIds, setLoadingIds] = useState<number[]>([]);

  const [shouldFocus, setShouldFocus] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (shouldFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        setShouldFocus(false);
      }, 50);
    }
  }, [shouldFocus]);

  const activeError = (message: string) => {
    setErrorMessage(message);
  };

  const handleAddTodo = (title: string) => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      activeError(ErrorMessages.EMPTY_TITLE);
      setShouldFocus(true);

      return;
    }

    setErrorMessage('');
    setIsAdding(true);

    const newTempTodo: Todo = {
      id: 0,
      userId: USER_ID,
      title: trimmedTitle,
      completed: false,
    };

    setTempTodo(newTempTodo);

    addTodo(trimmedTitle)
      .then(addedTodo => {
        setTodos(prevTodos => [...prevTodos, addedTodo]);
        setTempTodo(null);

        if (inputRef.current) {
          inputRef.current.value = '';
        }
      })
      .catch(() => {
        activeError(ErrorMessages.ADD_TODO);
      })
      .finally(() => {
        setIsAdding(false);
        setTempTodo(null);
        setShouldFocus(true);
      });
  };

  const handleToggleTodo = (todoId: number) => {
    const todoToUpdate = todos.find(todo => todo.id === todoId);

    if (!todoToUpdate) {
      return;
    }

    setLoadingIds(prev => [...prev, todoId]);

    updateTodo(todoId, { completed: !todoToUpdate.completed })
      .then(updatedTodo => {
        setTodos(prev =>
          prev.map(todo => (todo.id === todoId ? updatedTodo : todo)),
        );
      })
      .catch(() => {
        activeError(ErrorMessages.UPDATE_TODO);
      })
      .finally(() => {
        setLoadingIds(prev => prev.filter(id => id !== todoId));
      });
  };

  const handleDeleteTodo = (todoId: number) => {
    setLoadingIds(prev => [...prev, todoId]);

    deleteTodo(todoId)
      .then(() => {
        setTodos(prevTodos => prevTodos.filter(todo => todo.id !== todoId));
      })
      .catch(() => {
        activeError(ErrorMessages.DELETE_TODO);
        setShouldFocus(true);
      })
      .finally(() => {
        setLoadingIds(prev => prev.filter(id => id !== todoId));
        setShouldFocus(true);
      });
  };

  const handleClearCompleted = () => {
    const completedTodos = todos.filter(todo => todo.completed);

    if (completedTodos.length === 0) {
      return;
    }

    setErrorMessage('');
    setLoadingIds(prev => [...prev, ...completedTodos.map(todo => todo.id)]);

    Promise.allSettled(completedTodos.map(todo => deleteTodo(todo.id)))
      .then(results => {
        const failedIds: number[] = [];

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            failedIds.push(completedTodos[index].id);
          }
        });

        setTodos(prevTodos =>
          prevTodos.filter(
            todo => !todo.completed || failedIds.includes(todo.id),
          ),
        );

        if (failedIds.length > 0) {
          activeError(ErrorMessages.DELETE_TODO);
          setShouldFocus(true);
        }
      })
      .finally(() => {
        setLoadingIds(prev =>
          prev.filter(id => !completedTodos.some(todo => todo.id === id)),
        );

        setShouldFocus(true);
      });
  };

  useEffect(() => {
    if (!USER_ID) {
      return;
    }

    setErrorMessage('');
    setLoading(true);

    getTodos()
      .then(setTodos)
      .catch(() => activeError(ErrorMessages.LOAD_TODOS))
      .finally(() => {
        setLoading(false);
        setShouldFocus(true);
      });
  }, []);

  const allCompleted = todos.length > 0 && todos.every(todo => todo.completed);

  const handleToggleAll = () => {
    if (todos.length === 0) {
      return;
    }

    const newCompletedStatus = !allCompleted;

    setLoadingIds(prev => [...prev, ...todos.map(todo => todo.id)]);

    Promise.all(
      todos.map(todo => updateTodo(todo.id, { completed: newCompletedStatus })),
    )
      .then(updatedTodos => {
        setTodos(updatedTodos);
      })
      .catch(() => {
        activeError(ErrorMessages.UPDATE_TODO);
      })
      .finally(() => {
        setLoadingIds(prev =>
          prev.filter(id => !todos.some(todo => todo.id === id)),
        );
      });
  };

  if (!USER_ID) {
    return <UserWarning />;
  }

  const isDisabled = !todos.some(todo => todo.completed);
  const filteredTodos = getFilteredTodos(todos, filter);
  const todosCounter = getActiveTodosCount(todos);

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          <ToggleAllButton
            allCompleted={allCompleted}
            onToggleAll={handleToggleAll}
            isDisabled={loading}
          />

          <NewTodoForm
            onAddTodo={handleAddTodo}
            isAdding={isAdding || loading}
            inputRef={inputRef}
          />
        </header>

        <TodoList
          todos={filteredTodos}
          onToggle={handleToggleTodo}
          onDelete={handleDeleteTodo}
          loadingIds={loadingIds}
          tempTodo={tempTodo}
        />

        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <TodosCounter count={todosCounter} />

            <TodosFilter filter={filter} onFilterChange={setFilter} />

            <ClearCompletedButton
              onClearCompleted={handleClearCompleted}
              isDisabled={isDisabled}
            />
          </footer>
        )}
      </div>

      <ErrorNotification
        errorMessage={errorMessage}
        onClose={() => {
          setErrorMessage('');
          setShouldFocus(true);
        }}
      />
    </div>
  );
};
