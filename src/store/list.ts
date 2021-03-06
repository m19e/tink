import { atom } from "jotai";
import type { TweetV1 } from "twitter-api-v2";
import type { TrimmedList } from "../types/twitter";
import { displayTweetsCountAtom } from ".";

export const currentListAtom = atom<TrimmedList>({
	id_str: "",
	name: "",
	owner: {
		id_str: "",
		screen_name: "",
		name: "",
	},
	mode: "public",
});

export const listTimelineAtom = atom<TweetV1[]>([]);

export const cursorIndexAtom = atom(0);

export const focusIndexAtom = atom(0);

export const displayTimelineAtom = atom<TweetV1[]>((get) => {
	const cursor = get(cursorIndexAtom);
	const count = get(displayTweetsCountAtom);
	return get(listTimelineAtom).slice(cursor, cursor + count);
});

export const focusedTweetAtom = atom<TweetV1>(
	(get) => get(displayTimelineAtom)[get(focusIndexAtom)]
);

export const listTimelineCursorsAtom = atom<{
	since_id: string;
	max_id: string;
}>((get) => {
	const tweets = get(listTimelineAtom);
	if (!tweets.length) {
		return { since_id: "0", max_id: "0" };
	}
	const since_id = (BigInt(tweets[0].id_str) + BigInt(1)).toString();
	const max_id = (BigInt(tweets.slice(-1)[0].id_str) - BigInt(1)).toString();
	return { since_id, max_id };
});
