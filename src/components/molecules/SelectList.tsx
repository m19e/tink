import React from "react";
import type { VFC } from "react";
import { TrimmedList } from "../../types/twitter";
import SelectInput, { Item } from "./SelectInput";

interface Props {
	lists: Array<TrimmedList>;
	onSelect: (item: Item<TrimmedList>) => void;
}

const SelectList: VFC<Props> = ({ lists, onSelect }) => {
	const items = lists.map((list) => ({
		key: list.id_str,
		label: list.name + (list.mode === "private" ? " 🔒" : ""),
		value: list,
	}));

	return <SelectInput items={items} onSelect={onSelect} />;
};

export default SelectList;
