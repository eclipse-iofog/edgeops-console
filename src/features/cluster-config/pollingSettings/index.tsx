import React, { useState, useEffect } from "react";
import { usePollingConfig } from "@/app/providers";
import { useFeedback } from "@/app/providers";

function PollingSettings() {
  const { mainPollingInterval, slideoverPollingInterval, updatePollingConfig } =
    usePollingConfig();
  const { pushFeedback } = useFeedback();

  const [mainInterval, setMainInterval] = useState(mainPollingInterval);
  const [slideoverInterval, setSlideoverInterval] = useState(
    slideoverPollingInterval,
  );
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setMainInterval(mainPollingInterval);
    setSlideoverInterval(slideoverPollingInterval);
    setHasChanges(false);
  }, [mainPollingInterval, slideoverPollingInterval]);

  const validateInterval = (value: number): boolean => {
    return value >= 1000 && value <= 60000;
  };

  const handleMainIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setMainInterval(value);
      setHasChanges(true);
    }
  };

  const handleSlideoverIntervalChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setSlideoverInterval(value);
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    if (!validateInterval(mainInterval)) {
      pushFeedback({
        message: "Main polling interval must be between 1000ms and 60000ms",
        type: "error",
      });
      return;
    }

    if (!validateInterval(slideoverInterval)) {
      pushFeedback({
        message:
          "Slideover polling interval must be between 1000ms and 60000ms",
        type: "error",
      });
      return;
    }

    updatePollingConfig({
      mainPollingInterval: mainInterval,
      slideoverPollingInterval: slideoverInterval,
    });

    pushFeedback({
      message: "Polling settings saved successfully",
      type: "success",
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    setMainInterval(mainPollingInterval);
    setSlideoverInterval(slideoverPollingInterval);
    setHasChanges(false);
  };

  return (
    <div className="bg-gray-900 text-white overflow-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
        Polling Settings
      </h1>

      <div className="max-w-2xl mt-6 space-y-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-white">
            Polling Intervals
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            Configure how frequently the application fetches data from the
            controller. Lower values provide more real-time updates but may
            increase server load.
          </p>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="main-interval"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Main Polling Interval (ms)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Controls refresh rate for agents, applications, and system
                applications list
              </p>
              <input
                id="main-interval"
                type="number"
                min="1000"
                max="60000"
                step="1000"
                value={mainInterval}
                onChange={handleMainIntervalChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Range: 1000ms - 60000ms (Current: {mainInterval}ms ={" "}
                {(mainInterval / 1000).toFixed(1)}s)
              </p>
            </div>

            <div>
              <label
                htmlFor="slideover-interval"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Slideover Polling Interval (ms)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Controls refresh rate for data displayed in slideover panels
                when they are open
              </p>
              <input
                id="slideover-interval"
                type="number"
                min="1000"
                max="60000"
                step="1000"
                value={slideoverInterval}
                onChange={handleSlideoverIntervalChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Range: 1000ms - 60000ms (Current: {slideoverInterval}ms ={" "}
                {(slideoverInterval / 1000).toFixed(1)}s)
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default PollingSettings;
