import React, { useState } from "react";
import { Box, useInput } from "ink";
import { parseTweet } from "twitter-text";
import type { SetStateAction } from "jotai";
import type { TweetV1 } from "twitter-api-v2";
import type { ParsedTweet } from "twitter-text";
import type { TimelineProcess, Paginator, Mover } from "../../types";
import { useError, useRequestResult, useHint } from "../../hooks";
import { useApi } from "../../hooks/api";
import Detail from "./Detail";
import Footer from "./Footer";
import TweetItem from "../molecules/TweetItem";
import NewTweetBox from "../molecules/NewTweetBox";

interface BaseTimelineProps {
	type: "column" | "home" | "mentions" | "list" | "search";
	timeline: TweetV1[];
	setTimeline: (update?: SetStateAction<TweetV1[]>) => void | Promise<void>;
	mover: Mover;
	paginator: Paginator;
	countActions: {
		inc: () => void;
		dec: () => void;
	};
	focusedTweet: TweetV1;
}

interface UniqueTimelineProps extends BaseTimelineProps {
	type: "home" | "mentions";
}

interface ListTimelineProps extends BaseTimelineProps {
	type: "list";
}

type DuplicatableTimelineProps = ListTimelineProps;

// type Props = UniqueTimelineProps | DuplicatableTimelineProps;
type Props = BaseTimelineProps;

export const AbstractTimeline = ({
	type,
	timeline,
	setTimeline,
	mover,
	paginator,
	countActions,
	focusedTweet,
}: Props) => {
	const setError = useError()[1];
	const setRequestResult = useRequestResult()[1];
	const setHintKey = useHint()[1];
	const api = useApi();

	const [status, setStatus] = useState<"timeline" | "detail">("timeline");
	const [inProcess, setInProcess] = useState<TimelineProcess>("none");
	const [isNewTweetOpen, setIsNewTweetOpen] = useState(false);
	const [waitReturn, setWaitReturn] = useState(false);
	const [tweetText, setTweetText] = useState("");
	const [{ weightedLength, valid }, setParsedTweet] = useState<ParsedTweet>(
		parseTweet("")
	);
	const [isTweetInDetailOpen, setIsTweetInDetailOpen] = useState(false);
	const [loadingTimeline, setLoadingTimeline] = useState<TweetV1[]>([]);

	const setTimelineHint = () => {
		if (type === "home" || type === "mentions") {
			setHintKey("unique/timeline");
		}
		if (type === "list") {
			setHintKey("list/timeline");
		}
		if (type === "search") {
			setHintKey("search/timeline");
		}
		if (type === "column") {
			setHintKey("timeline");
		}
	};

	const update = async ({ future }: { future: boolean }) => {
		setInProcess("update");
		if (future) {
			setLoadingTimeline(timeline);
		}
		const err = future
			? await paginator.fetchFuture()
			: await paginator.fetchPast();
		if (future) {
			setLoadingTimeline([]);
		}
		if (typeof err === "string") {
			setError(err);
		} else {
			setError(undefined);
		}
		setInProcess("none");
	};

	const fav = async () => {
		setInProcess("fav");
		const { favorited, id_str } = focusedTweet;
		const res = favorited
			? await api.unfavorite(id_str)
			: await api.favorite(id_str);
		if (typeof res === "string") {
			setError(res);
		} else {
			updateTweetInTimeline(res);
			setRequestResult(
				`Successfully ${res.favorited ? "favorited" : "unfavorited"}: @${
					res.user.screen_name
				} "${res.full_text.split("\n").join(" ")}"`
			);
		}
		setInProcess("none");
	};

	const rt = async () => {
		setInProcess("rt");
		const { retweeted, id_str } = focusedTweet;
		const res = retweeted
			? await api.unretweet(id_str)
			: await api.retweet(id_str);
		if (typeof res === "string") {
			setError(res);
		} else {
			updateTweetInTimeline(res);
			setRequestResult(
				`Successfully ${res.retweeted ? "retweeted" : "unretweeted"}: @${
					res.user.screen_name
				} "${res.full_text.split("\n").join(" ")}"`
			);
		}
		setInProcess("none");
	};

	const newTweet = async () => {
		if (!valid) return;
		setInProcess("tweet");
		const err = await api.tweet(tweetText);
		if (typeof err === "string") {
			setError(err);
		} else {
			setIsNewTweetOpen(false);
			setRequestResult(`Successfully tweeted: "${tweetText}"`);
			handleNewTweetChange("");
			setTimelineHint();
		}
		setWaitReturn(false);
		setInProcess("none");
	};

	const updateTweetInTimeline = (newTweet: TweetV1) =>
		setTimeline((prev) =>
			prev.map((t) => (t.id_str === newTweet.id_str ? newTweet : t))
		);

	useInput(
		(input, key) => {
			if (inProcess !== "none") return;

			if (key.upArrow || (key.shift && key.tab)) {
				mover.prev(() => update({ future: true }));
			} else if (key.downArrow || key.tab) {
				mover.next(() => update({ future: false }));
			} else if (key.pageUp) {
				mover.pageUp(() => update({ future: true }));
			} else if (key.pageDown) {
				mover.pageDown(() => update({ future: false }));
			} else if (input === "0" && !key.meta) {
				mover.top();
			} else if (input === "9" && !key.meta) {
				mover.bottom();
			} else if (input === "+" || input === "=") {
				countActions.inc();
			} else if (input === "-" || input === "_") {
				countActions.dec();
			} else if (input === "t") {
				rt();
			} else if (input === "f") {
				fav();
			} else if (input === "n") {
				setRequestResult(undefined);
				setIsNewTweetOpen(true);
				setHintKey("timeline/new/input");
			} else if (key.return) {
				setStatus("detail");
				setHintKey("timeline/detail");
			}
		},
		{ isActive: status === "timeline" && !isNewTweetOpen }
	);

	useInput(
		(_, key) => {
			if (inProcess !== "none") return;

			if (key.escape && waitReturn) {
				setWaitReturn(false);
				setHintKey("timeline/new/input");
			} else if (key.escape) {
				handleNewTweetChange("");
				setIsNewTweetOpen(false);
				setTimelineHint();
			} else if (key.return && waitReturn) {
				newTweet();
			}
		},
		{ isActive: status === "timeline" && isNewTweetOpen }
	);

	useInput(
		(input, key) => {
			if (key.escape) {
				setStatus("timeline");
				setTimelineHint();
			} else if (input === "t") {
				rt();
			} else if (input === "f") {
				fav();
			}
		},
		{ isActive: status === "detail" && !isTweetInDetailOpen }
	);

	const handleMention = () => {
		handleNewTweetChange(`@${focusedTweet.user.screen_name} `);
		setRequestResult(undefined);
		setIsNewTweetOpen(true);
		setStatus("timeline");
		setTimelineHint();
	};

	const handleRemoveFocusedTweet = (
		{
			redraft,
		}: {
			redraft: boolean;
		} = { redraft: false }
	) => {
		if (redraft) {
			handleNewTweetChange(focusedTweet.full_text);
			setIsNewTweetOpen(true);
		}
		setTimeline((prev) =>
			prev.filter((tw) => tw.id_str !== focusedTweet.id_str)
		);
		setStatus("timeline");
		if (redraft) {
			setHintKey("timeline/new/input");
		} else {
			setTimelineHint();
		}
	};

	const handleNewTweetChange = (text: string) => {
		setTweetText(text);
		setParsedTweet(parseTweet(text));
	};

	const handleWaitReturn = () => {
		setWaitReturn(valid);
		if (valid) setHintKey("timeline/new/wait-return");
	};

	const Switcher = () => {
		if (status === "detail") {
			return (
				<Detail
					tweet={focusedTweet}
					onMention={handleMention}
					onRemove={handleRemoveFocusedTweet}
					isTweetOpen={isTweetInDetailOpen}
					setIsTweetOpen={setIsTweetInDetailOpen}
					inProcess={inProcess}
					setInProcess={setInProcess}
				/>
			);
		}
		if (loadingTimeline.length) {
			return (
				<Box flexDirection="column" flexGrow={1}>
					{loadingTimeline.map((t) => (
						<TweetItem
							key={t.id_str}
							tweet={t}
							isFocused={false}
							inFav={false}
							inRT={false}
						/>
					))}
				</Box>
			);
		}
		return (
			<>
				<Box flexDirection="column" flexGrow={1}>
					{timeline.map((t) => (
						<TweetItem
							key={t.id_str}
							tweet={t}
							isFocused={t.id_str === focusedTweet.id_str}
							inFav={t.id_str === focusedTweet.id_str && inProcess === "fav"}
							inRT={t.id_str === focusedTweet.id_str && inProcess === "rt"}
						/>
					))}
				</Box>
				{isNewTweetOpen && (
					<NewTweetBox
						type="new"
						loading={inProcess === "tweet"}
						tweet={focusedTweet}
						invalid={!valid && weightedLength !== 0}
						length={weightedLength}
						placeholder="What's happening?"
						focus={!waitReturn}
						value={tweetText}
						onChange={handleNewTweetChange}
						onSubmit={handleWaitReturn}
					/>
				)}
			</>
		);
	};

	return (
		<>
			<Switcher />
			<Footer />
		</>
	);
};
