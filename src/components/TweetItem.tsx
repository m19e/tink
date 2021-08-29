import React from "react";
import { Text, Box } from "ink";

import { Tweet } from "../types/twitter";
import { getDisplayTimeAgo } from "../lib";

type Props = {
	tweet: Tweet;
	isFocused: boolean;
};

const TweetItem = ({ tweet, isFocused }: Props) => {
	const t = tweet.retweeted_status ?? tweet;
	const ago = getDisplayTimeAgo(
		tweet.retweeted_status
			? tweet.retweeted_status.created_at
			: tweet.created_at
	);

	return (
		<Box
			flexDirection="column"
			borderStyle={isFocused ? "singleDouble" : "single"}
			borderColor={isFocused ? "white" : "gray"}
		>
			{tweet.retweeted_status && (
				<Text dimColor>
					🔄 {tweet.user.name}
					{tweet.user.protected && "🔒"} RT
				</Text>
			)}
			<Text>
				<Text color={tweet.retweeted_status ? "greenBright" : "#00acee"}>
					{`${t.user.name} @${t.user.screen_name} `}
					{t.user.protected && "🔒 "}
				</Text>
				<Text dimColor>{ago}</Text>
			</Text>
			<Text>
				{t.full_text}
				{tweet.entities.media && <Text dimColor> (with Media)</Text>}
			</Text>
			<Box height={1}>
				{isFocused && (
					<>
						<Box marginRight={2}>
							<Text>{t.retweet_count ? t.retweet_count + " " : ""}</Text>
							<Text color={t.retweeted ? "green" : "white"}>RT</Text>
						</Box>
						<Box marginRight={2}>
							<Text>{t.favorite_count ? t.favorite_count + " " : ""}</Text>
							<Text color={t.favorited ? "yellow" : "white"}>fav</Text>
						</Box>
					</>
				)}
			</Box>
		</Box>
	);
};

export default TweetItem;
