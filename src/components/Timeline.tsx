import React, { useState } from "react";
import type { FC } from "react";
import { Text, Box, Newline, useInput } from "ink";
import Divider from "ink-divider";
import useDimensions from "ink-use-stdout-dimensions";
import TextInput from "ink-text-input";
import SelectInput, { ItemProps } from "ink-select-input";
import { parseTweet, ParsedTweet } from "twitter-text";

import { Tweet } from "../types/twitter";
import { getDisplayTime } from "../lib";
import { postReply, postDeleteTweet } from "../lib/twitter";
import {
	useUserId,
	useClient,
	useMover,
	useCursorIndex,
	getDisplayTimeline,
	getFocusedTweet,
} from "../hooks";
import TweetItem from "./TweetItem";
import Loader from "./Loader";

// const DISPLAY_TWEETS_COUNT = 5;

type Props = {
	timeline: Tweet[];
	onToggleList: () => void;
	onUpdate: (backward: boolean) => Promise<number>;
	onNewTweet: (s: string) => Promise<null | any>;
	onFav: (t: Tweet) => Promise<Tweet | null>;
	onRT: (t: Tweet) => Promise<Tweet | null>;
};

const Timeline = ({
	timeline,
	onToggleList,
	onUpdate,
	onNewTweet,
	onFav,
	onRT,
}: Props) => {
	// const [cursor, setCursor] = useState(0);
	// const [focus, setFocus] = useState(0);
	// const [displayTimeline, setDisplayTimeline] = useState<Tweet[]>(
	// 	timeline.slice(0, DISPLAY_TWEETS_COUNT)
	// );
	const displayTimeline = getDisplayTimeline();
	const mover = useMover();
	const [, setCursor] = useCursorIndex();
	const focusedTweet = getFocusedTweet();

	const [fetching, setFetching] = useState(false);
	const [inFav, setInFav] = useState(false);
	const [inRT, setInRT] = useState(false);
	const [inNewTweet, setInNewTweet] = useState(false);

	const [isNewTweetOpen, setIsNewTweetOpen] = useState(false);
	const [waitReturn, setWaitReturn] = useState(false);
	const [tweetText, setTweetText] = useState("");
	const [{ weightedLength, valid }, setParsedTweet] = useState<ParsedTweet>(
		parseTweet("")
	);

	const [status, setStatus] = useState<"timeline" | "detail">("timeline");

	const [isReplyOpen, setIsReplyOpen] = useState(false);

	const update = async (backward: boolean) => {
		setFetching(true);
		const len = await onUpdate(backward);
		if (!backward) setCursor((prev) => prev + len);
		setFetching(false);
	};

	const newTweet = async () => {
		if (!valid) return;
		setFetching(true);
		setInNewTweet(true);
		const err = await onNewTweet(tweetText);
		setInNewTweet(false);
		if (err !== null) {
			// onError()
		} else {
			setIsNewTweetOpen(false);
			setTweetText("");
		}
		setFetching(false);
	};

	const fav = async () => {
		setFetching(true);
		setInFav(true);
		const res = await onFav(focusedTweet);
		if (res === null) {
			// onError()
		} else {
			// setDisplayTimeline((prev) =>
			// 	prev.map((t) => (t.id_str === res.id_str ? res : t))
			// );
		}
		setInFav(false);
		setFetching(false);
	};

	const rt = async () => {
		setFetching(true);
		setInRT(true);
		const res = await onRT(focusedTweet);
		if (res === null) {
			// onError()
		} else {
			// setDisplayTimeline((prev) =>
			// 	prev.map((t) => (t.id_str === res.id_str ? res : t))
			// );
		}
		setInRT(false);
		setFetching(false);
	};

	useInput(
		(input, key) => {
			if (fetching) return;

			if (key.upArrow || (key.shift && key.tab)) {
				mover.prev(() => update(false));
			} else if (key.downArrow || key.tab) {
				mover.next(() => update(true));
			} else if (key.pageUp) {
				mover.pageUp(() => update(false));
			} else if (key.pageDown) {
				mover.pageDown(() => update(true));
			} else if (input === "l") {
				onToggleList();
			} else if (input === "r") {
				// reply();
			} else if (input === "t") {
				rt();
			} else if (input === "f") {
				fav();
			} else if (input === "n") {
				setIsNewTweetOpen(true);
			} else if (key.return) {
				setStatus("detail");
			}
		},
		{ isActive: status === "timeline" && !isNewTweetOpen }
	);

	useInput(
		(_, key) => {
			if (fetching) return;

			if (key.escape) {
				if (waitReturn) {
					setWaitReturn(false);
					return;
				}
				// Avoid warning: state update on an unmounted TextInput
				// Maybe caused by Node.js (single-threaded)?
				setTimeout(() => {
					setTweetText("");
					setIsNewTweetOpen(false);
				});
			} else if (waitReturn && key.return) {
				newTweet();
				setWaitReturn(false);
			}
		},
		{ isActive: status === "timeline" && isNewTweetOpen }
	);

	useInput(
		(input, key) => {
			if (key.escape) {
				setStatus("timeline");
			}
		},
		{ isActive: status === "detail" && !isReplyOpen }
	);

	const handleNewTweetChange = (value: string) => {
		setTweetText(value);
		setParsedTweet(parseTweet(value));
	};

	return (
		<>
			{status === "timeline" && (
				<>
					<Text>
						{/* cursor:{cursor} focus:{focus} len:{timeline.length} */}
					</Text>
					<Box flexGrow={1} flexDirection="column">
						{displayTimeline.map((t, i) => (
							<TweetItem
								key={i}
								tweet={t}
								isFocused={t.id_str === focusedTweet.id_str}
								inFav={t.id_str === focusedTweet.id_str && inFav}
								inRT={t.id_str === focusedTweet.id_str && inRT}
							/>
						))}
					</Box>
					{isNewTweetOpen ? (
						<>
							<Box justifyContent="space-between" paddingX={1}>
								<Text>
									New Tweet <Loader loading={inNewTweet} rawColor="#00acee" />
								</Text>
								<Text>{280 - weightedLength}</Text>
							</Box>
							<Box borderStyle="round" borderColor="white">
								<TextInput
									placeholder="What's happening?"
									value={tweetText}
									onChange={handleNewTweetChange}
									onSubmit={() => setWaitReturn(valid)}
									focus={!waitReturn}
								/>
							</Box>
							<Box justifyContent="flex-start" paddingX={1}>
								{waitReturn ? (
									<Text>[Enter] tweet [ESC] cancel</Text>
								) : (
									<Text>[Enter] done [ESC] close</Text>
								)}
							</Box>
						</>
					) : (
						<Text>
							[R] reply [T] retweet [F] favorite [N] tweet [Enter] detail
						</Text>
					)}
				</>
			)}
			{status === "detail" && (
				<Detail
					tweet={focusedTweet}
					isReplyOpen={isReplyOpen}
					setIsReplyOpen={setIsReplyOpen}
				/>
			)}
		</>
	);
};

const Detail = ({
	tweet,
	isReplyOpen,
	setIsReplyOpen,
}: {
	tweet: Tweet;
	isReplyOpen: boolean;
	setIsReplyOpen: (b: boolean) => void;
}) => {
	const t = tweet.retweeted_status ?? tweet;
	const time = getDisplayTime(t.created_at);
	const displayFavRT = t.retweet_count !== 0 || t.favorite_count !== 0;

	const [inProcess, setInProcess] = useState<
		"none" | "reply" | "rt" | "fav" | "delete"
	>("none");

	const [cols] = useDimensions();
	const [client] = useClient();
	const [userId] = useUserId();
	const myTweet = t.user.id_str === userId;
	let selectItems: SelectItemProps[] = [
		{
			label: `Tweet to @${t.user.screen_name}`,
			value: "mention",
		},
	];
	if (myTweet) {
		selectItems = selectItems.concat([
			{ label: "Delete", value: "delete" },
			{ label: "Re-draft", value: "redraft" },
		]);
	} else {
		selectItems = selectItems.concat([
			{ label: `Mute @${t.user.screen_name}`, value: "mute-account" },
			{ label: "Mute Retweets from user", value: "mute-retweets" },
			{ label: "Mute Quotes from User", value: "mute-quotes" },
			{ label: `Block @${t.user.screen_name}`, value: "block-account" },
		]);
	}
	selectItems = selectItems.concat([
		{
			label: `Mute "${t.source.replace(/(<([^>]+)>)/gi, "")}"`,
			value: "mute-client",
		},
	]);

	const [waitReturn, setWaitReturn] = useState(false);
	const [replyText, setReplyText] = useState("");
	const [{ weightedLength, valid }, setParsedTweet] = useState<ParsedTweet>(
		parseTweet("")
	);

	const reply = async () => {
		setInProcess("reply");
		const error = await postReply(client, {
			status: replyText,
			in_reply_to_status_id: t.id_str,
		});
		setInProcess("none");
		if (error !== null) {
			// onError()
			return;
		}
		setIsReplyOpen(false);
		setWaitReturn(false);
		setReplyText("");
		setParsedTweet(parseTweet(""));
	};

	const deleteTweet = async () => {
		setInProcess("delete");
		const error = await postDeleteTweet(client, { id: t.id_str });
		setInProcess("none");
		if (error !== null) {
			// onError
			return;
		}
	};

	useInput(
		(input, key) => {
			if (input === "r") {
				setIsReplyOpen(true);
			}
		},
		{ isActive: !isReplyOpen && inProcess === "none" }
	);

	useInput(
		(input, key) => {
			if (key.escape) {
				if (waitReturn) {
					setWaitReturn(false);
					return;
				}
				// Avoid warning: state update on an unmounted TextInput
				// Maybe caused by Node.js (single-threaded)?
				setTimeout(() => {
					setReplyText("");
					setIsReplyOpen(false);
				});
			} else if (waitReturn && key.return) {
				reply();
			}
		},
		{ isActive: isReplyOpen && inProcess === "none" }
	);

	const handleReplyChange = (value: string) => {
		setReplyText(value);
		setParsedTweet(parseTweet(value));
	};

	const handleSelectMenu = ({ value }: { label: string; value: string }) => {
		if (value === "delete") {
			deleteTweet();
		}
	};

	return (
		<>
			<Box flexGrow={1} flexDirection="column" alignItems="center">
				<Box
					flexDirection="column"
					minWidth={30}
					width={Math.floor(cols / 2)}
					paddingX={1}
				>
					<Text color="#00acee">{t.user.name}</Text>
					<Text dimColor>
						@{t.user.screen_name}
						{t.user.protected && " 🔒"}
					</Text>
					<Box flexDirection="column" paddingY={1}>
						<Text>{t.full_text}</Text>
						{t.entities.media && <Text dimColor>(with Media)</Text>}
					</Box>
					<Text dimColor>
						{time}・{t.source.replace(/(<([^>]+)>)/gi, "")}
					</Text>
				</Box>
				<Divider width={Math.max(30, Math.floor(cols / 2))} />
				{displayFavRT && (
					<>
						<Box minWidth={30} width={Math.floor(cols / 2)} paddingX={1}>
							<Text>
								{t.retweet_count !== 0 && (
									<>
										<Text>{t.retweet_count} </Text>
										<Text color={t.retweeted ? "green" : "white"}>RT </Text>
									</>
								)}
								{t.favorite_count !== 0 && (
									<>
										<Text>{t.favorite_count} </Text>
										<Text color={t.favorited ? "yellow" : "white"}>fav </Text>
									</>
								)}
							</Text>
						</Box>
						<Divider width={Math.max(30, Math.floor(cols / 2))} />
					</>
				)}
				{isReplyOpen && (
					<Box
						minWidth={30}
						width={Math.floor(cols / 2)}
						flexDirection="column"
					>
						<Box justifyContent="space-between" paddingX={1}>
							<Text color="gray">
								Replying to <Text color="#00acee">@{t.user.screen_name} </Text>
								<Loader loading={inProcess === "reply"} rawColor="#00acee" />
							</Text>
							<Text color="gray">{280 - weightedLength}</Text>
						</Box>
						<Box minHeight={5} borderStyle="round" borderColor="#777777">
							<TextInput
								placeholder="Tweet your reply"
								value={replyText}
								onChange={handleReplyChange}
								onSubmit={() => setWaitReturn(valid)}
								focus={!waitReturn}
							/>
						</Box>
					</Box>
				)}
				{!isReplyOpen && (
					<Box
						justifyContent="flex-end"
						minWidth={30}
						width={Math.floor(cols / 2)}
					>
						<Box flexDirection="column">
							<Box paddingX={1}>
								<Text color="gray">
									Menu{" "}
									<Loader
										loading={inProcess === "delete"}
										namedColor="redBright"
									/>
								</Text>
							</Box>
							<Box paddingRight={2} borderStyle="round" borderColor="gray">
								<SelectInput
									items={selectItems}
									itemComponent={SelectItem}
									indicatorComponent={Indicator}
									onSelect={handleSelectMenu}
								/>
							</Box>
						</Box>
					</Box>
				)}
			</Box>
			{isReplyOpen ? (
				<>
					{waitReturn ? (
						<Text>[Enter] reply [ESC] cancel</Text>
					) : (
						<Text>[Enter] done [ESC] close</Text>
					)}
				</>
			) : (
				<Text>[R] reply [T] retweet [F] favorite [ESC] back</Text>
			)}
		</>
	);
};

interface SelectItemProps extends ItemProps {
	value: string;
	newline?: boolean;
}

const SelectItem: FC<SelectItemProps> = ({
	isSelected = false,
	label,
	newline = false,
}) => (
	<>
		<Text color={isSelected ? "#00acee" : undefined}>{label}</Text>
		{newline && <Newline />}
	</>
);

const Indicator: FC<{
	isSelected?: boolean;
}> = ({ isSelected = false }) => (
	<Box marginRight={1}>
		{isSelected ? <Text color="#00acee">❯</Text> : <Text> </Text>}
	</Box>
);

export default Timeline;
