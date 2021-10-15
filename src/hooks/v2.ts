import { useAtom, SetStateAction } from "jotai";
import type {
	TwitterApi,
	ListV1,
	ListStatusesV1Params,
	TweetV1,
} from "twitter-api-v2";
import type { UserConfig, HandledResponseError } from "../types";
import { twitterClientAtom, userConfigAtom } from "../store/v2";
import { handleResponseError } from "../lib/helpers";

export const useUserConfig = (): [
	UserConfig | null,
	(update?: SetStateAction<UserConfig>) => void
] => useAtom(userConfigAtom);

type PromiseWithError<T> = Promise<T | HandledResponseError>;

export const useTwitterClient = (): [
	TwitterApi | null,
	(update?: SetStateAction<TwitterApi>) => void
] => useAtom(twitterClientAtom);

interface ClientApi {
	getLists: () => PromiseWithError<ListV1[]>;
	getListTweets: (params: ListStatusesV1Params) => PromiseWithError<TweetV1[]>;
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
			return (await api.listStatuses(params)).tweets;
		} catch (error) {
			return handleResponseError(error, "GET", "lists/statuses");
		}
	};

	return {
		getLists,
		getListTweets,
	};
};
