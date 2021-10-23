import { useAtom } from "jotai";
import type { SetStateAction } from "jotai";
import type { Column, TimelineHintKey } from "../types";
import { columnsAtom, requestResultAtom, errorAtom, hintAtom } from "../store";
import { hintMap } from "../consts";

export const useColumnMap = () => {
	const [columns, setCs] = useAtom(columnsAtom);
	const actions = {
		set: (key: string, value: Column) => {
			setCs((prev) => {
				const copy = new Map(prev);
				copy.set(key, value);
				return copy;
			});
		},
		setAll: (iterable: Iterable<readonly [string, Column]>) => {
			setCs(new Map(iterable));
		},
		delete: (key: string) => {
			setCs((prev) => {
				const copy = new Map(prev);
				copy.delete(key);
				return copy;
			});
		},
	};
	return [columns, actions];
};

export const useRequestResult = (): [
	string | undefined,
	(update: string) => void
] => {
	const [requestResult, setR]: [
		string | undefined,
		(update?: SetStateAction<string | undefined>) => void | Promise<void>
	] = useAtom(requestResultAtom);
	const [error, setError]: [
		string | undefined,
		(update?: SetStateAction<string | undefined>) => void | Promise<void>
	] = useAtom(errorAtom);

	const setRequestResult = (r: string) => {
		if (error) setError(undefined);
		setR(r);
	};

	return [requestResult, setRequestResult];
};

export const useError = (): [string | undefined, (update: string) => void] => {
	const [error, setE]: [
		string | undefined,
		(update?: SetStateAction<string | undefined>) => void | Promise<void>
	] = useAtom(errorAtom);
	const [requestResult, setRequestResult]: [
		string | undefined,
		(update?: SetStateAction<string | undefined>) => void | Promise<void>
	] = useAtom(requestResultAtom);

	const setError = (e: string) => {
		if (requestResult) setRequestResult(undefined);
		setE(e);
	};

	return [error, setError];
};

export const useHint = (): [
	string | undefined,
	(key: TimelineHintKey) => void
] => {
	const [hint, setHint]: [
		string | undefined,
		(update?: SetStateAction<string | undefined>) => void | Promise<void>
	] = useAtom(hintAtom);

	const setHintKey = (key: TimelineHintKey) => setHint(hintMap.get(key));

	return [hint, setHintKey];
};
