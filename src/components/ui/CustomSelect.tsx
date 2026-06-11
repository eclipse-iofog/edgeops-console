import Select, {
  GroupBase,
  MultiValue,
  SingleValue,
  ActionMeta,
} from "react-select";

type OptionType = {
  label: string;
  value: string;
};

type CustomSelectProps = {
  options: OptionType[];
  isMulti?: boolean;
  placeholder?: string;
  className?: string;
  isClearable?: boolean;
  selected?: OptionType | OptionType[] | null;
  setSelected?: (value: any) => void;
  setIsOpen?: (value: boolean) => void;
};

export default function CustomSelect({
  options,
  isMulti,
  placeholder,
  className,
  isClearable,
  selected,
  setSelected,
  setIsOpen,
}: CustomSelectProps) {
  const handleChange = (
    value: SingleValue<OptionType> | MultiValue<OptionType>,
    actionMeta: ActionMeta<OptionType>,
  ) => {
    const selectedValue = isMulti
      ? (value as MultiValue<OptionType>)?.slice() || null
      : (value as SingleValue<OptionType> | null);

    if (setSelected) {
      if (!selectedValue) {
        setSelected(null);
        setIsOpen?.(false);
      } else if (Array.isArray(selectedValue)) {
        setSelected(selectedValue);
        setIsOpen?.(true);
      } else {
        setSelected(selectedValue.value);
        setIsOpen?.(true);
      }
    }
  };

  return (
    <Select<OptionType, boolean, GroupBase<OptionType>>
      className={className}
      isMulti={isMulti}
      options={options}
      onChange={handleChange}
      value={selected as any}
      placeholder={placeholder}
      isClearable={isClearable}
      styles={{
        control: (provided) => ({
          ...provided,
          backgroundColor: "white",
          color: "black",
        }),
        menu: (provided) => ({
          ...provided,
          backgroundColor: "white",
          color: "black",
        }),
        singleValue: (provided) => ({ ...provided, color: "black" }),
        option: (provided, state) => ({
          ...provided,
          backgroundColor: state.isFocused ? "#f0f0f0" : "white",
          color: "black",
        }),
      }}
    />
  );
}
