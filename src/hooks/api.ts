import type {
	TweetV1,
	UserV1,
	FriendshipV1,
	ListV1,
	ListMembershipsV1Paginator,
	TweetV1TimelineParams,
	UserShowV1Params,
	FriendshipShowV1Params,
	ListStatusesV1Params,
	ListMembershipsV1Params,
	AddOrRemoveListMembersV1Params,
	AccountProfileV1Params,
	TweetV1UserTimelineParams,
	UserTimelineV1Paginator,
	UserLookupV1Params,
	DoubleEndedIdCursorV1Result,
} from "twitter-api-v2";
import type { HandledResponseError } from "../types";
import type {
	TweetV1SearchParams,
	FriendOrFollowerIdsV1Params,
} from "../types/twitter";
import { convertTweetToDisplayable } from "../lib";
import { handleResponseError } from "../lib/helpers";
import { useTwitterClient } from "../hooks";

type PromiseWithError<T> = Promise<T | HandledResponseError>;
type PromiseWithErrorMessage<T> = Promise<T | HandledResponseError["message"]>;

interface Api {
	getHomeTweets: (
		params: TweetV1TimelineParams
	) => PromiseWithErrorMessage<TweetV1[]>;
	getMentionTweets: (
		params: TweetV1TimelineParams
	) => PromiseWithErrorMessage<TweetV1[]>;
	getLists: () => PromiseWithError<ListV1[]>;
	getListTweets: (
		params: ListStatusesV1Params
	) => PromiseWithErrorMessage<TweetV1[]>;
	getTweet: (id: string) => PromiseWithErrorMessage<TweetV1>;
	getUser: (params: UserShowV1Params) => PromiseWithErrorMessage<UserV1>;
	getUsers: (params: UserLookupV1Params) => PromiseWithErrorMessage<UserV1[]>;
	getRelation: (
		params: FriendshipShowV1Params
	) => PromiseWithErrorMessage<FriendshipV1>;
	getUserListed: (
		params: Partial<ListMembershipsV1Params>
	) => PromiseWithErrorMessage<ListMembershipsV1Paginator>;
	getUserTimeline: (
		params: Partial<TweetV1UserTimelineParams>
	) => PromiseWithErrorMessage<UserTimelineV1Paginator>;

	tweet: (status: string) => PromiseWithErrorMessage<null>;
	reply: (
		status: string,
		in_reply_to_status_id: string
	) => PromiseWithErrorMessage<null>;
	quote: (
		status: string,
		attachment_url: string
	) => PromiseWithErrorMessage<null>;
	deleteTweet: (id: string) => PromiseWithErrorMessage<null>;

	search: (params: TweetV1SearchParams) => PromiseWithErrorMessage<TweetV1[]>;
	favorite: (id: string) => PromiseWithErrorMessage<TweetV1>;
	unfavorite: (id: string) => PromiseWithErrorMessage<TweetV1>;
	retweet: (id: string) => PromiseWithErrorMessage<TweetV1>;
	unretweet: (id: string) => PromiseWithErrorMessage<TweetV1>;

	userFavorites: (
		params: Partial<TweetV1UserTimelineParams>
	) => PromiseWithErrorMessage<TweetV1[]>;
	userFollowing: (
		params: FriendOrFollowerIdsV1Params
	) => PromiseWithErrorMessage<DoubleEndedIdCursorV1Result>;
	userFollowed: (
		params: FriendOrFollowerIdsV1Params
	) => PromiseWithErrorMessage<DoubleEndedIdCursorV1Result>;
}

export const useApi = (): Api => {
	const [{ v1: api }] = useTwitterClient();

	const getHomeTweets = async (params: TweetV1TimelineParams) => {
		try {
			return (await api.homeTimeline(params)).tweets.map(
				convertTweetToDisplayable
			);
		} catch (error) {
			return handleResponseError(error, "GET", "statuses/home_timeline")
				.message;
		}
	};
	const getMentionTweets = async (params: TweetV1TimelineParams) => {
		try {
			return (await api.mentionTimeline(params)).tweets.map(
				convertTweetToDisplayable
			);
		} catch (error) {
			return handleResponseError(error, "GET", "statuses/mentions_timeline")
				.message;
		}
	};
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
			return handleResponseError(error, "GET", "lists/statuses").message;
		}
	};
	const getTweet = async (id: string) => {
		try {
			return convertTweetToDisplayable(await api.singleTweet(id));
		} catch (error) {
			return handleResponseError(error, "GET", "statuses/show").message;
		}
	};
	const getUser = async (params: UserShowV1Params) => {
		try {
			return await api.user(params);
		} catch (error) {
			return handleResponseError(error, "GET", "users/show").message;
		}
	};
	const getUsers = async (params: UserLookupV1Params) => {
		try {
			if (params.user_id.length && params.user_id.length > 100) {
				// generate two-dimensional array
				// or
				// return "Error: too many ids"
				// or return { data: UserV1[], remain: string[], done: string[] }
			}
			return await api.users(params);
		} catch (error) {
			return handleResponseError(error, "GET", "users/lookup").message;
		}
	};
	const getRelation = async (params: FriendshipShowV1Params) => {
		try {
			return await api.friendship(params);
		} catch (error) {
			return handleResponseError(error, "GET", "friendships/show").message;
		}
	};

	// WIP
	const getUserListed = async (params: Partial<ListMembershipsV1Params>) => {
		try {
			return await api.listMemberships(params);
		} catch (error) {
			return handleResponseError(error, "GET", "lists/memberships").message;
		}
	};
	const getUserTimeline = async (
		params: Partial<TweetV1UserTimelineParams>
	) => {
		try {
			return await api.userTimeline(params.user_id, params);
		} catch (error) {
			return handleResponseError(error, "GET", "statuses/user_timeline")
				.message;
		}
	};

	const tweet = async (status: string) => {
		try {
			await api.tweet(status);
			return null;
		} catch (error) {
			return handleResponseError(error, "POST", "statuses/update").message;
		}
	};
	const reply = async (status: string, in_reply_to_status_id: string) => {
		try {
			await api.reply(status, in_reply_to_status_id);
			return null;
		} catch (error) {
			return handleResponseError(error, "POST", "statuses/update").message;
		}
	};
	const quote = async (status: string, attachment_url: string) => {
		try {
			await api.tweet(status, { attachment_url });
			return null;
		} catch (error) {
			return handleResponseError(error, "POST", "statuses/update").message;
		}
	};
	const deleteTweet = async (id: string) => {
		try {
			await api.deleteTweet(id);
			return null;
		} catch (error) {
			return handleResponseError(error, "POST", "statuses/destroy").message;
		}
	};
	const addListMembers = async (params: AddOrRemoveListMembersV1Params) => {};
	const removeListMembers = async (
		params: AddOrRemoveListMembersV1Params
	) => {};
	const updateProfile = async (params: Partial<AccountProfileV1Params>) => {};

	// Local http wrappers
	const search = async (params: TweetV1SearchParams) => {
		try {
			const { statuses } = await api.get<{ statuses: TweetV1[] }>(
				"search/tweets.json",
				{ ...params }
			);
			return statuses.map(convertTweetToDisplayable);
		} catch (error) {
			return handleResponseError(error, "GET", "search/tweets").message;
		}
	};
	const favorite = async (id: string) => {
		try {
			await api.post("favorites/create.json", { id });
			return await getTweet(id);
		} catch (error) {
			return handleResponseError(error, "POST", "favorites/create").message;
		}
	};
	const unfavorite = async (id: string) => {
		try {
			await api.post("favorites/destroy.json", { id });
			return await getTweet(id);
		} catch (error) {
			return handleResponseError(error, "POST", "favorites/destroy").message;
		}
	};
	const retweet = async (id: string) => {
		try {
			await api.post(`statuses/retweet/${id}.json`);
			return await getTweet(id);
		} catch (error) {
			return handleResponseError(error, "POST", "statuses/retweet").message;
		}
	};
	const unretweet = async (id: string) => {
		try {
			await api.post(`statuses/unretweet/${id}.json`);
			return await getTweet(id);
		} catch (error) {
			return handleResponseError(error, "POST", "statuses/unretweet").message;
		}
	};

	// WIP
	const userFavorites = async (params: Partial<TweetV1UserTimelineParams>) => {
		try {
			return await api.get("favorites/list.json", { ...params });
		} catch (error) {
			return handleResponseError(error, "GET", "favorites/list").message;
		}
	};
	const userFollowing = async (params: FriendOrFollowerIdsV1Params) => {
		try {
			return await api.get<DoubleEndedIdCursorV1Result>("friends/ids.json", {
				...params,
			});
		} catch (error) {
			return handleResponseError(error, "GET", "friends/ids").message;
		}
	};
	const userFollowed = async (params: FriendOrFollowerIdsV1Params) => {
		try {
			return await api.get<DoubleEndedIdCursorV1Result>("followers/ids.json", {
				...params,
			});
		} catch (error) {
			return handleResponseError(error, "GET", "followers/ids").message;
		}
	};

	return {
		getHomeTweets,
		getMentionTweets,
		getLists,
		getListTweets,
		getTweet,
		getUser,
		getUsers,
		getRelation,
		getUserListed,
		getUserTimeline,
		tweet,
		reply,
		quote,
		deleteTweet,
		search,
		favorite,
		unfavorite,
		retweet,
		unretweet,
		userFavorites,
		userFollowing,
		userFollowed,
	};
};
