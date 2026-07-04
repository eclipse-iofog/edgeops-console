import React, {
  ReactNode,
  useReducer,
  useContext,
  createContext,
  useCallback,
  useMemo,
} from "react";
import { findIndex } from "lodash";
import Alert from "@/components/ui/Alert";

type FeedbackType = "success" | "error" | "warning" | "info";

interface Feedback {
  id: number;
  message: string;
  type: FeedbackType;
  timeout: number;
  createdAt: number;
  autoHideMs: number;
  remainingTime?: number;
  [key: string]: any;
}

interface FeedbackContextType {
  feedbacks: Feedback[];
  setFeedbacks: (feedbacks: Feedback[]) => void;
  pushFeedback: (feedback: Omit<Feedback, "id" | "timeout">) => void;
}

export const FeedbackContext = createContext<FeedbackContextType>({
  feedbacks: [],
  setFeedbacks: () => {},
  pushFeedback: () => {},
});

export const useFeedback = () => useContext(FeedbackContext);

const AUTO_HIDE_BY_TYPE: Record<FeedbackType, number> = {
  success: 4000,
  error: 6000,
  warning: 6000,
  info: 6000,
};

const getAutoHideMs = (type: FeedbackType) =>
  AUTO_HIDE_BY_TYPE[type] ?? 6000;

const actions = {
  ADD: "add",
  REMOVE: "remove",
  SET: "set",
  PAUSE: "pause",
  RESUME: "resume",
} as const;

type Action =
  | {
      type: typeof actions.ADD;
      data: Omit<Feedback, "id" | "timeout">;
      dispatch: React.Dispatch<Action>;
    }
  | { type: typeof actions.REMOVE; data: { id: number } }
  | { type: typeof actions.SET; data: Feedback[] }
  | { type: typeof actions.PAUSE; data: { id: number } }
  | {
      type: typeof actions.RESUME;
      data: { id: number; dispatch: React.Dispatch<Action> };
    };

interface State {
  feedbacks: Feedback[];
  nextId: number;
}

const initState: State = {
  feedbacks: [],
  nextId: 0,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actions.ADD: {
      const { message, type, ...rest } = action.data;
      const createdAt = Date.now();
      const autoHideMs = getAutoHideMs(type);

      const newFeedback: Feedback = {
        id: state.nextId,
        message,
        type,
        autoHideMs,
        timeout: window.setTimeout(() => {
          action.dispatch({ type: actions.REMOVE, data: { id: state.nextId } });
        }, autoHideMs),
        createdAt,
        ...rest,
      };

      return {
        feedbacks: [...state.feedbacks, newFeedback],
        nextId: state.nextId + 1,
      };
    }
    case actions.REMOVE: {
      const idxToRemove = findIndex(
        state.feedbacks,
        (f) => f.id === action.data.id,
      );
      if (idxToRemove === -1) return state;
      clearTimeout(state.feedbacks[idxToRemove].timeout);

      return {
        ...state,
        feedbacks: [
          ...state.feedbacks.slice(0, idxToRemove),
          ...state.feedbacks.slice(idxToRemove + 1),
        ],
      };
    }
    case actions.PAUSE: {
      const idxToPause = findIndex(
        state.feedbacks,
        (f) => f.id === action.data.id,
      );
      if (idxToPause === -1) return state;

      const feedback = state.feedbacks[idxToPause];
      clearTimeout(feedback.timeout);

      const elapsed = Date.now() - feedback.createdAt;
      const remainingTime = Math.max(0, feedback.autoHideMs - elapsed);

      return {
        ...state,
        feedbacks: state.feedbacks.map((f, idx) =>
          idx === idxToPause
            ? {
                ...f,
                timeout: 0,
                remainingTime:
                  remainingTime > 0 ? remainingTime : feedback.autoHideMs,
              }
            : f,
        ),
      };
    }
    case actions.RESUME: {
      const idxToResume = findIndex(
        state.feedbacks,
        (f) => f.id === action.data.id,
      );
      if (idxToResume === -1) return state;

      const feedback = state.feedbacks[idxToResume];
      const remainingTime = feedback.remainingTime ?? feedback.autoHideMs;

      if (remainingTime > 100) {
        // Only resume if there's meaningful time left (more than 100ms)
        const newTimeout = window.setTimeout(() => {
          action.data.dispatch({
            type: actions.REMOVE,
            data: { id: feedback.id },
          });
        }, remainingTime);

        return {
          ...state,
          feedbacks: state.feedbacks.map((f, idx) =>
            idx === idxToResume
              ? {
                  ...f,
                  timeout: newTimeout,
                  remainingTime: undefined,
                  createdAt: Date.now() - (feedback.autoHideMs - remainingTime),
                }
              : f,
          ),
        };
      } else {
        // If very little time remaining, remove immediately by returning updated state
        clearTimeout(feedback.timeout);
        return {
          ...state,
          feedbacks: [
            ...state.feedbacks.slice(0, idxToResume),
            ...state.feedbacks.slice(idxToResume + 1),
          ],
        };
      }
    }
    case actions.SET:
      return {
        ...state,
        feedbacks: action.data,
      };
    default:
      return state;
  }
};

interface FeedbackProviderProps {
  children: ReactNode;
}

export default function FeedbackProvider({ children }: FeedbackProviderProps) {
  const [state, dispatch] = useReducer(reducer, initState);

  const setFeedbacks = useCallback((newFeedbacks: Feedback[]) => {
    dispatch({ type: actions.SET, data: newFeedbacks });
  }, []);

  const pushFeedback = useCallback(
    (newFeedback: Omit<Feedback, "id" | "timeout">) => {
      dispatch({ type: actions.ADD, data: newFeedback, dispatch });
    },
    [dispatch],
  );

  const handleMouseEnter = useCallback((id: number) => {
    dispatch({ type: actions.PAUSE, data: { id } });
  }, []);

  const handleMouseLeave = useCallback((id: number) => {
    dispatch({ type: actions.RESUME, data: { id, dispatch } });
  }, [dispatch]);

  const contextValue = useMemo(
    () => ({
      feedbacks: state.feedbacks,
      setFeedbacks,
      pushFeedback,
    }),
    [state.feedbacks, setFeedbacks, pushFeedback],
  );

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
      <Alert
        open={state.feedbacks.length > 0}
        alerts={state.feedbacks.map((f) => ({
          ...f,
          onClose: () => dispatch({ type: actions.REMOVE, data: { id: f.id } }),
          onMouseEnter: () => handleMouseEnter(f.id),
          onMouseLeave: () => handleMouseLeave(f.id),
        }))}
      />
    </FeedbackContext.Provider>
  );
}
