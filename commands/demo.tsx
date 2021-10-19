import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Box, Text, useInput } from "ink";
import got from "got";
import TwitterApi from "twitter-api-v2";
import type {
	TwitterApiv1,
	TwitterApiTokens,
	ListTimelineV1Paginator,
} from "twitter-api-v2";
import { config } from "dotenv";
import { terminalImageFromBuffer } from "../src/lib/sindresorhus/terminal-image";
import PinAuthInput from "../src/components/molecules/PinAuthInput";
import TweetItem from "../src/components/molecules/TweetItem";

const reg = new RegExp(
	"[" +
		// "Basic Latin"
		"\u{1}-\u{6}\u{8}-\u{c}\u{10}-\u{1f}" +
		// "Latin-1 Supplement"
		"\u{84}\u{85}\u{8c}\u{90}\u{98}\u{9b}\u{9d}-\u{9f}" +
		// "Combining Diacritical Marks"
		"\u{300}-\u{36f}" +
		// "Dingbats"
		"\u{270c}\u{270d}" +
		// "Linear B Syllabary" ~ "Early Dynastic Cuneiform"
		"\u{10000}-\u{1254f}" +
		// "Egyptian Hieroglyphs" ~ "Anatolian Hieroglyphs"
		"\u{13000}-\u{1467f}" +
		// "Bamum Supplement" ~ "Tangut Supplement"
		"\u{16800}-\u{18d8f}" +
		// "Kana Supplement" ~ "Duployan"
		"\u{1b002}-\u{1bcaf}" +
		// "Byzantine Musical Symbols" ~ "Sutton SignWriting"
		"\u{1d000}-\u{1daaf}" +
		// "Glagolitic Supplement" ~ "Enclosed Alphanumeric Supplement"
		"\u{1e000}-\u{1f003}\u{1f005}-\u{1f18d}\u{1f18f}\u{1f190}\u{1f19b}-\u{1f1e5}" +
		// "Enclosed Ideographic Supplement"
		"\u{1f260}-\u{1f265}" +
		// "Miscellaneous Symbols and Pictographs"
		"\u{1f321}-\u{1f32c}\u{1f336}\u{1f37d}\u{1f394}-\u{1f39f}\u{1f3cd}\u{1f3ce}\u{1f3d4}-\u{1f3df}\u{1f3f1}-\u{1f3f3}\u{1f3f5}-\u{1f3f7}\u{1f43f}\u{1f441}\u{1f4fe}\u{1f4fd}\u{1f53e}-\u{1f54a}\u{1f54f}\u{1f568}-\u{1f573}\u{1f576}-\u{1f579}\u{1f57b}-\u{1f58f}\u{1f591}-\u{1f594}\u{1f597}-\u{1f5a3}\u{1f5a5}-\u{1f5fa}" +
		// "Ornamental Dingbats"
		"\u{1f650}-\u{1f67f}" +
		// "Transport and Map Symbols"
		"\u{1f6c6}-\u{1f6cb}\u{1f6cd}-\u{1f6cf}\u{1f6d3}\u{1f6d4}\u{1f6d6}-\u{1f6ea}\u{1f6f0}-\u{1f6f3}\u{1f6fb}-\u{1f6fc}" +
		// "Alchemical Symbols"
		"\u{1f700}-\u{1f77f}" +
		// "Geometric Shapes Extended"
		"\u{1f780}-\u{1f7df}" +
		// "Supplemental Arrows-C"
		"\u{1f800}-\u{1f8ff}" +
		// "Supplemental Symbols and Pictographs"
		"\u{1f900}-\u{1f90c}\u{1f93b}\u{1f946}\u{1f972}\u{1f977}-\u{1f979}\u{1f9a3}\u{1f9a4}\u{1f9ab}-\u{1f9ad}\u{1f9cb}\u{1f9cc}\u{1f9}-\u{1f9}\u{1f9}-\u{1f9}" +
		// "Chess Symbols"
		"\u{1fa00}-\u{1fa6f}" +
		// "Symbols and Pictographs Extended-A"
		"\u{1fa74}\u{1fa83}-\u{1fa86}\u{1fa96}-\u{1faa8}\u{1fab0}-\u{1fab6}\u{1fac0}-\u{1fac2}\u{1fad0}-\u{1fad6}" +
		// "Symbols for Legacy Computing"
		"\u{1fb00}-\u{1fbff}" +
		// "Variation Selectors Supplement"
		"\u{e0100}-\u{e01ef}" +
		"]",
	"u"
);

const generateEmojiArray = (emoji: string, range: number): string[] => {
	const cp = emoji.codePointAt(0).toString(16);
	const int = parseInt(cp, 16);

	return [...Array(range).keys()].map((index) =>
		String.fromCodePoint(int + index)
	);
};

const tmp =
	"🧙‍♀🤏🏻🙆🏻‍♀️🙇🏻‍♀️🤲🏻𓈒𓂂✌🩰🪘🪚🫖🐿(◜‧̮◝ )( ͡° ͜ʖ ͡°)🏖🌡🌣🌥🌦🌨🌪🌬🌭🎔🎖🎘🎚🎜🎞🎠🏔🏗🏚🏝🏱🏲🏳🏵🏶🏷🐿📾📽🔾🕀🕃🕈🕏🕪🕰🕶🖈🖔🗐🗺🌶🍽🏍🏎👁🕭✍";

const Demo = ({ start, count = 100 }: { start: string; count: number }) => {
	const array: string[] = generateEmojiArray(
		String.fromCodePoint(parseInt(start, 16)),
		count
	).reverse();

	return (
		<Box flexDirection="column" paddingY={2}>
			{array.map((line, i) => (
				<Box key={i} width={16} borderStyle="round" borderColor="white">
					<Text>
						{[...line].map((c) => c.codePointAt(0).toString(16)).join() + " "}
					</Text>
					<Text>
						{[...line].filter((c) => !reg.test(c)).join("") + " " + line}
					</Text>
				</Box>
			))}
			<Box width={16} borderStyle="round" borderColor="cyan">
				<Text>
					LastIndex:{" "}
					{[...array[0]].map((c) => c.codePointAt(0).toString(16)).join() +
						" " +
						array[0]}
				</Text>
			</Box>
		</Box>
	);
};

Demo.propTypes = {
	start: PropTypes.string.isRequired,
	count: PropTypes.number,
};

Demo.shortFlags = {
	start: "s",
	count: "c",
};

const Image = () => {
	const [image, setImage] = useState("");
	useEffect(() => {
		const f = async () => {
			const body = await got("https://sindresorhus.com/unicorn").buffer();
			const imageFromBuffer = await terminalImageFromBuffer(body, {
				width: 40,
				preserveAspectRatio: true,
			});
			setImage(imageFromBuffer);
		};
		f();
	}, []);

	useInput(() => {}, {});

	return (
		<Box>
			<Box width="50%" borderStyle="round">
				<Text>{image || "Loading..."}</Text>
			</Box>
		</Box>
	);
};

config();

const defaultTokens: TwitterApiTokens = {
	appKey: process.env.TWITTER_CONSUMER_KEY,
	appSecret: process.env.TWITTER_CONSUMER_SECRET,
};

const Auth = () => {
	const [client, setClient] = useState<TwitterApiv1 | undefined>(undefined);
	const [authLink, setAuthLink] = useState({
		oauth_token: "",
		oauth_token_secret: "",
		oauth_callback_confirmed: "true",
		url: "",
	});
	const [pin, setPIN] = useState("");
	const [listTimeline, setListTimeline] = useState<
		ListTimelineV1Paginator | undefined
	>(undefined);

	useEffect(() => {
		const f = async () => {
			const initClient = new TwitterApi(defaultTokens);
			const link = await initClient.generateAuthLink("oob");
			setAuthLink(link);
		};
		f();
	}, []);

	const handleSubmit = async (p: string) => {
		const oauthClient = new TwitterApi({
			...defaultTokens,
			accessToken: authLink.oauth_token,
			accessSecret: authLink.oauth_token_secret,
		});
		const { client: loggedClient } = await oauthClient.login(p);

		const firstList = (await loggedClient.v1.lists())[0];
		const tl = await loggedClient.v1.listStatuses({
			list_id: firstList.id_str,
		});
		setListTimeline(tl);
		setClient(loggedClient.v1);
	};
	if (listTimeline) {
		return (
			<Box flexDirection="column">
				{listTimeline.tweets.map((tweet, i) => (
					<TweetItem
						key={i}
						tweet={tweet}
						isFocused={false}
						inFav={false}
						inRT={false}
					/>
				))}
			</Box>
		);
	}

	if (authLink.url) {
		return (
			<PinAuthInput
				url={authLink.url}
				value={pin}
				onChange={setPIN}
				onSubmit={handleSubmit}
			/>
		);
	} else {
		return <Text>Loading...</Text>;
	}
};

export default Auth;
