import React from "react";

interface BadgeListProps {
  items: string[] | string | undefined | null;
  emptyLabel?: string;
  className?: string;
}

/** Controller may return JSON-stringified arrays (e.g. agent availableRuntimes). */
function normalizeBadgeItems(
  items: string[] | string | undefined | null,
): string[] {
  if (items == null || items === "") {
    return [];
  }
  if (Array.isArray(items)) {
    return items.map(String);
  }
  if (typeof items === "string") {
    const trimmed = items.trim();
    if (!trimmed) {
      return [];
    }
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.map(String) : [trimmed];
      } catch {
        return [trimmed];
      }
    }
    return [trimmed];
  }
  return [];
}

/**
 * Display an array of items as badges
 */
export const BadgeList: React.FC<BadgeListProps> = ({
  items,
  emptyLabel = "(all)",
  className = "",
}) => {
  const normalizedItems = normalizeBadgeItems(items);

  if (normalizedItems.length === 0) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300 ${className}`}
      >
        {emptyLabel}
      </span>
    );
  }

  // Handle empty string in array (means "core" API group)
  const displayItems = normalizedItems.map((item) =>
    item === "" ? "core" : item,
  );

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {displayItems.map((item, index) => (
        <span
          key={index}
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-200 border border-blue-700/50"
        >
          {item}
        </span>
      ))}
    </div>
  );
};

interface VerbBadgeProps {
  verb: string;
}

/**
 * Display a verb with color coding
 */
export const VerbBadge: React.FC<VerbBadgeProps> = ({ verb }) => {
  const getVerbColor = (v: string) => {
    const lowerVerb = v.toLowerCase();
    if (lowerVerb === "*") {
      return "bg-purple-900/50 text-purple-200 border-purple-700/50";
    }
    if (["get", "list"].includes(lowerVerb)) {
      return "bg-green-900/50 text-green-200 border-green-700/50";
    }
    if (["create", "update", "patch"].includes(lowerVerb)) {
      return "bg-yellow-900/50 text-yellow-200 border-yellow-700/50";
    }
    if (lowerVerb === "delete") {
      return "bg-red-900/50 text-red-200 border-red-700/50";
    }
    return "bg-gray-700 text-gray-300 border-gray-600";
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getVerbColor(verb)}`}
    >
      {verb}
    </span>
  );
};

interface VerbListProps {
  verbs: string[] | undefined;
  emptyLabel?: string;
  className?: string;
}

/**
 * Display an array of verbs as color-coded badges
 */
export const VerbList: React.FC<VerbListProps> = ({
  verbs,
  emptyLabel = "(all verbs)",
  className = "",
}) => {
  if (!verbs || verbs.length === 0) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300 ${className}`}
      >
        {emptyLabel}
      </span>
    );
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {verbs.map((verb, index) => (
        <VerbBadge key={index} verb={verb} />
      ))}
    </div>
  );
};

interface ResourceListProps {
  resources: string[] | undefined;
  emptyLabel?: string;
  className?: string;
  maxItems?: number;
}

/**
 * Display an array of resources as badges with truncation support
 */
export const ResourceList: React.FC<ResourceListProps> = ({
  resources,
  emptyLabel = "(all resources)",
  className = "",
  maxItems,
}) => {
  if (!resources || resources.length === 0) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300 ${className}`}
      >
        {emptyLabel}
      </span>
    );
  }

  const displayResources = maxItems ? resources.slice(0, maxItems) : resources;
  const remainingCount = maxItems ? resources.length - maxItems : 0;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {displayResources.map((resource, index) => (
        <span
          key={index}
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-900/50 text-indigo-200 border border-indigo-700/50 max-w-xs truncate"
          title={resource}
        >
          {resource}
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
};

interface SubjectBadgeProps {
  subject: {
    kind: string;
    name: string;
    apiGroup?: string;
  };
}

/**
 * Display a subject (User, Group, or ServiceAccount) as a badge
 */
export const SubjectBadge: React.FC<SubjectBadgeProps> = ({ subject }) => {
  const getSubjectColor = (kind: string) => {
    const lowerKind = kind.toLowerCase();
    if (lowerKind === "user") {
      return "bg-cyan-900/50 text-cyan-200 border-cyan-700/50";
    }
    if (lowerKind === "group") {
      return "bg-teal-900/50 text-teal-200 border-teal-700/50";
    }
    if (lowerKind === "serviceaccount") {
      return "bg-orange-900/50 text-orange-200 border-orange-700/50";
    }
    return "bg-gray-700 text-gray-300 border-gray-600";
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getSubjectColor(subject.kind)}`}
        >
          {subject.kind}
        </span>
        <span className="text-sm font-medium text-white">{subject.name}</span>
      </div>
      {subject.apiGroup && (
        <div className="text-xs text-gray-400">
          API Group: {subject.apiGroup}
        </div>
      )}
    </div>
  );
};
