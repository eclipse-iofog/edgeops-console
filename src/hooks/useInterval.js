/* eslint-disable react-hooks/exhaustive-deps */
import React from "react";

function useRecursiveTimeout(callback, delay) {
  const savedCallback = React.useRef(callback);

  // Remember the latest callback.
  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the timeout loop.
  React.useEffect(() => {
    let id;
    function tick() {
      const ret = savedCallback.current();

      if (ret instanceof Promise) {
        ret.then(() => {
          if (delay !== null) {
            id = setTimeout(tick, delay);
          }
        });
      } else {
        if (delay !== null) {
          id = setTimeout(tick, delay);
        }
      }
    }
    if (delay !== null) {
      (savedCallback.current || callback)();
      id = setTimeout(tick, delay);
      return () => id && clearTimeout(id);
    }
  }, [delay]);
}

export default useRecursiveTimeout;
