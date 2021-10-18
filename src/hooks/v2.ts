import { useAtom, SetStateAction } from "jotai";
import type {
	TwitterApi,
	ListV1,
	TweetV1,
	ListStatusesV1Params,
} from "twitter-api-v2";
import type { UserConfig, HandledResponseError } from "../types";
import { TrimmedList } from "../types/twitter";
import {
	twitterClientAtom,
	userConfigAtom,
	currentListAtom,
	listTimelineAtom,
	listTimelineCursorsAtom,
	displayTimelineAtom,
	focusedTweetAtom,
	cursorIndexAtom,
	focusIndexAtom,
	displayTweetsCountAtom,
} from "../store/v2";
import { convertTweetToDisplayable } from "../lib";
import { handleResponseError } from "../lib/helpers";

export const useUserConfig = (): [
	UserConfig | null,
	(update?: SetStateAction<UserConfig>) => void
] => useAtom(userConfigAtom);

type PromiseWithError<T> = Promise<T | HandledResponseError>;
type PromiseWithErrorMessage<T> = Promise<T | HandledResponseError["message"]>;

export const useTwitterClient = (): [
	TwitterApi | null,
	(update?: SetStateAction<TwitterApi>) => void
] => useAtom(twitterClientAtom);

interface ClientApi {
	getLists: () => PromiseWithError<ListV1[]>;
	getListTweets: (params: ListStatusesV1Params) => PromiseWithError<TweetV1[]>;
	getTweet: (id: string) => PromiseWithError<TweetV1>;
	tweet: (status: string) => PromiseWithError<null>;
	reply: (
		status: string,
		in_reply_to_status_id: string
	) => PromiseWithError<null>;
	deleteTweet: (id: string) => PromiseWithError<null>;
	favorite: (id: string) => PromiseWithError<TweetV1>;
	unfavorite: (id: string) => PromiseWithError<TweetV1>;
	retweet: (id: string) => PromiseWithError<TweetV1>;
	unretweet: (id: string) => PromiseWithError<TweetV1>;
}

export const useTwitterApi = (): ClientApi => {
	const [{ v1: api }] = useAtom(twitterClientAtom);

	const getLists = async () => {
		try {
			return await api.lists();
		} catch (error) {
			return handleResponseError(error, "GET", "lists/list");
		}
	};
	const getListTweets = async (params: ListStatusesV1Params) => {
		try {
			return (await api.listStatuses(params)).tweets.map(
				convertTweetToDisplayable
			);
		} catch (error) {
			return handleResponseError(error, "GET", "lists/statuses");
		}
	};
	const getTweet = async (id: string) => {
		try {
			return convertTweetToDisplayable(await api.singleTweet(id));
		} catch (error) {
			return handleResponseError(error, "GET", "statuses/show");
		}
	};

	const tweet = async (status: string) => {
		try {
			await api.tweet(status);
			return null;
		} catch (error) {
			return handleResponseError(error, "POST", "statuses/update");
		}
	};
	const reply = async (status: string, in_reply_to_status_id: string) => {
		try {
			await api.reply(status, in_reply_to_status_id);
			return null;
		} catch (error) {
			return handleResponseError(error, "POST", "statuses/update");
		}
	};
	const deleteTweet = async (id: string) => {
		try {
			await api.deleteTweet(id);
			return null;
		} catch (error) {
			return handleResponseError(error, "POST", "statuses/destroy");
		}
	};

	const favorite = async (id: string) => {
		try {
			await api.post("favorites/create.json", { id });
			return await getTweet(id);
		} catch (error) {
			return handleResponseError(error, "POST", "favorites/create");
		}
	};
	const unfavorite = async (id: string) => {
		try {
			await api.post("favorites/destroy.json", { id });
			return await getTweet(id);
		} catch (error) {
			return handleResponseError(error, "POST", "favorites/destroy");
		}
	};
	const retweet = async (id: string) => {
		try {
			await api.post(`statuses/retweet/${id}.json`);
			return await getTweet(id);
		} catch (error) {
			return handleResponseError(error, "POST", "statuses/retweet");
		}
	};
	const unretweet = async (id: string) => {
		try {
			await api.post(`statuses/destroy/${id}.json`);
			return await getTweet(id);
		} catch (error) {
			return handleResponseError(error, "POST", "statuses/unretweet");
		}
	};

	return {
		getLists,
		getListTweets,
		getTweet,
		tweet,
		reply,
		deleteTweet,
		favorite,
		unfavorite,
		retweet,
		unretweet,
	};
};

export const getDisplayTimeline = () => useAtom(displayTimelineAtom)[0];

export const useDisplayTweetsCount = (): [
	number,
	{ inc: () => void; dec: () => void }
] => {
	const [count, setCount] = useAtom(displayTweetsCountAtom);
	const [focus, setFocus] = useAtom(focusIndexAtom);
	const inc = () => {
		if (count < 20) setCount((c) => c + 1);
	};
	const dec = () => {
		if (count > 1) {
			if (count - 1 === focus) setFocus((f) => f - 1);
			setCount((c) => c - 1);
		}
	};
	return [count, { inc, dec }];
};

export const useCursorIndex = () => useAtom(cursorIndexAtom);

export const useFocusIndex = () => useAtom(focusIndexAtom);

export const getFocusedTweet = () => useAtom(focusedTweetAtom)[0];

export const useCurrentList = (): [
	TrimmedList,
	(update?: SetStateAction<TrimmedList>) => void
] => useAtom(currentListAtom);

export const useListTimeline = (): [
	Array<TweetV1>,
	(update?: SetStateAction<Array<TweetV1>>) => void
] => useAtom(listTimelineAtom);

interface ListPaginator {
	tweets: Array<TweetV1>;
	fetchNewer: () => PromiseWithError<null>;
	fetchOlder: () => PromiseWithError<null>;
}

export const useListPaginator = (): ListPaginator => {
	const [{ v1: api }] = useAtom(twitterClientAtom);
	const [timeline, setTimeline]: [
		Array<TweetV1>,
		(update?: SetStateAction<Array<TweetV1>>) => void
	] = useAtom(listTimelineAtom);
	const [{ id_str: list_id }] = useAtom(currentListAtom);
	const [{ since_id, max_id }] = useAtom(listTimelineCursorsAtom);
	const [, setCursor] = useAtom(cursorIndexAtom);
	const defaultParams: ListStatusesV1Params = {
		count: 200,
		tweet_mode: "extended",
		include_entities: true,
	};

	const fetchNewer = async () => {
		try {
			const { tweets } = await api.listStatuses({
				...defaultParams,
				list_id,
				since_id,
			});
			if (tweets.length) {
				const converted = tweets.map(convertTweetToDisplayable);
				setCursor((prev) => prev + tweets.length);
				setTimeline((prev) => [...converted, ...prev]);
			}
			return null;
		} catch (error) {
			return handleResponseError(error, "GET", "lists/statuses");
		}
	};
	const fetchOlder = async () => {
		try {
			const { tweets } = await api.listStatuses({
				...defaultParams,
				list_id,
				max_id,
			});
			if (tweets.length) {
				const converted = tweets.map(convertTweetToDisplayable);
				setTimeline((prev) => [...prev, ...converted]);
			}
			return null;
		} catch (error) {
			return handleResponseError(error, "GET", "lists/statuses");
		}
	};

	return {
		tweets: timeline,
		fetchNewer,
		fetchOlder,
	};
};

export const useMover = (): {
	prev: (update: () => void) => void;
	next: (update: () => void) => void;
	pageUp: (update: () => void) => void;
	pageDown: (update: () => void) => void;
	top: () => void;
	bottom: () => void;
} => {
	const [count] = useAtom(displayTweetsCountAtom);
	const [{ length }] = useAtom(listTimelineAtom);
	const [cursor, setCursor] = useAtom(cursorIndexAtom);
	const [focus, setFocus] = useAtom(focusIndexAtom);

	const prev = (update: () => void) => {
		if (focus === 0) {
			if (cursor === 0) {
				update();
			} else {
				setCursor((c) => c - 1);
			}
		} else {
			setFocus((f) => f - 1);
		}
	};
	const next = (update: () => void) => {
		if (focus + 1 === count) {
			if (cursor + count + 1 > length) {
				update();
			} else {
				setCursor((c) => c + 1);
			}
		} else {
			setFocus((f) => f + 1);
		}
	};
	const pageUp = (update: () => void) => {
		if (cursor + focus <= count) {
			setCursor(0);
			update();
		} else {
			setCursor(Math.max(cursor - count, 0));
		}
	};
	const pageDown = (update: () => void) => {
		if (cursor + count * 2 > length) {
			setCursor(length - count);
			update();
		} else {
			setCursor(Math.min(cursor + count, length - count - 1));
		}
	};
	const top = () => {
		if (cursor !== 0) {
			setCursor(0);
		}
	};
	const bottom = () => {
		if (cursor < length - count) {
			setCursor(length - count);
		}
	};

	return { prev, next, pageUp, pageDown, top, bottom };
};
