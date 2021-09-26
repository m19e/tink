import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import path from "path";
import {
	mkdirsSync,
	readdirSync,
	existsSync,
	readJsonSync,
	writeJson,
} from "fs-extra";
import { Text, Box, useApp } from "ink";
import useDimensions from "ink-use-stdout-dimensions";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import Twitter, { TwitterOptions } from "twitter-lite";
import { config as dotenvConfig } from "dotenv";

import { Tweet, TrimmedList } from "../src/types/twitter";
import { GetListTweetsParams } from "../src/types";
import { convertTweetToDisplayable } from "../src/lib";
import { getUserListsApi, getListTweetsApi } from "../src/lib/api";
import {
	useUserId,
	useClient,
	useTimeline,
	getFocusedPosition,
	useCursorIndex,
	useFocusIndex,
} from "../src/hooks";
import Timeline from "../src/components/Timeline";

dotenvConfig();

const defaultOptions = {
	consumer_key: process.env.TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
};

interface Config extends TwitterOptions {
	user_id: string;
	lists: TrimmedList[];
}

/// Hello world command
const Tink = ({ name = "" }) => {
	const [ot, setOT] = useState("");
	const [pin, setPIN] = useState("");
	const [filePath, setFilePath] = useState("");

	const [status, setStatus] = useState<"init" | "wait" | "select" | "timeline">(
		"init"
	);
	const [lists, setLists] = useState<TrimmedList[]>([]);
	const [currentList, setCurrentList] = useState<TrimmedList | null>(null);
	const [timeline, setTimeline] = useTimeline();
	const { position, total } = getFocusedPosition();
	const [, setCursor] = useCursorIndex();
	const [, setFocus] = useFocusIndex();

	const [error, setError] = useState("");

	const [client, setClient] = useClient();
	const [, rows] = useDimensions();
	const [, setUserId] = useUserId();
	const { exit } = useApp();

	useEffect(() => {
		const init = async () => {
			setClient(new Twitter(defaultOptions));
			const [fp, conf, err] = getConfig();
			if (err !== null || !conf.access_token_key || !conf.access_token_secret) {
				if (err !== null) {
					console.error("cannot get configuration: ", err);
					exit();
				}
				setFilePath(fp);

				const rt = await client.getRequestToken("oob");
				const { oauth_token } = rt as {
					oauth_token: string;
				};
				setOT(oauth_token);
				setStatus("wait");
			} else {
				setClient(new Twitter(conf));
				setFilePath(fp);
				setUserId(conf.user_id);
				await getUserLists(conf, fp);
				setStatus("select");
			}
		};

		init();
	}, []);

	const getConfig = (profile: string = ""): [string, Config | null, any] => {
		let dir = process.env.HOME ?? "";
		if (dir === "" && process.platform === "win32") {
			dir = process.env.APPDATA ?? "";
			if (dir === "") {
				dir = path.join(
					process.env.USERPROFILE ?? "",
					"Application Data",
					"tink"
				);
			}
		} else {
			dir = path.join(dir, ".config", "tink");
		}

		try {
			mkdirsSync(dir);
		} catch (err) {
			return ["", null, err];
		}

		let file = "";
		if (profile === "") {
			file = path.join(dir, "settings.json");
		} else if (profile === "?") {
			try {
				const names = readdirSync(dir, { withFileTypes: true })
					.filter(
						(d) =>
							d.isFile() &&
							path.extname(d.name) === ".json" &&
							d.name.match(/^settings-/)
					)
					.map((d) => path.parse(d.name).name.replace("settings-", ""));

				console.log(names.length ? names.join("\n") : "tink has no accounts.");
				exit();
			} catch (err) {
				return ["", null, err];
			}
		} else {
			file = path.join(dir, "settings-" + profile + ".json");
		}

		let conf: Config;
		const json = readJsonSync(file, { throws: false });
		if (json === null) {
			if (existsSync(file)) {
				return ["", null, "CANNOT READ JSON"];
			}
			conf = { ...defaultOptions, user_id: "", lists: [] };
		} else {
			conf = json;
		}

		return [file, conf, null];
	};

	const getUserLists = async (config: Config, fp: string) => {
		const user = new Twitter(config);
		const res = await getUserListsApi(user);
		// onError
		if (!Array.isArray(res)) {
			setError(res.message);
			if (res.rate_limit && config.lists.length) {
				setLists(config.lists);
				setStatus("select");
			} else {
				exit();
			}
			return;
		}
		// onEmpty
		if (!res.length) {
			setError("Empty: GET lists/list");
			exit();
			return;
		}
		// Valid response
		const trim: TrimmedList[] = res.map((l) => ({
			id_str: l.id_str,
			name: l.name,
			mode: l.mode,
		}));
		await writeJson(fp, { ...config, lists: trim });
		setLists(trim);
		setStatus("select");
	};

	const getListTimeline = async (
		list_id: string,
		options: { backward: boolean; select: boolean }
	): Promise<Tweet[]> => {
		const params = createGetListTimelineParams({
			list_id,
			count: 200,
			...options,
		});

		const res = await getListTweetsApi(client, params);
		if (!Array.isArray(res) || res.length === 0) return [];

		const converted = res.map(convertTweetToDisplayable);
		return converted;
	};

	const createGetListTimelineParams = ({
		list_id,
		count,
		backward,
		select,
	}: {
		list_id: string;
		count: number;
		backward: boolean;
		select: boolean;
	}): GetListTweetsParams => {
		const params: GetListTweetsParams = {
			list_id,
			count,
			tweet_mode: "extended",
			include_entities: true,
		};
		if (select) return params;
		if (backward) {
			const oldest = timeline.slice(-1)[0];
			return { ...params, max_id: oldest.id_str };
		}
		const newest = timeline[0];
		return { ...params, since_id: newest.id_str };
	};

	const handleSubmitPinAuth = async (p: string) => {
		const token = await client.getAccessToken({
			oauth_verifier: p,
			oauth_token: ot,
		});

		const conf: Config = {
			...defaultOptions,
			access_token_key: token.oauth_token,
			access_token_secret: token.oauth_token_secret,
			user_id: token.user_id,
			lists: [],
		};

		setClient(new Twitter(conf));
		await getUserLists(conf, filePath);
		setStatus("select");
	};

	const handleSelect = async ({
		value,
	}: {
		label: string;
		value: TrimmedList;
	}) => {
		const data = await getListTimeline(value.id_str, {
			backward: false,
			select: true,
		});
		setTimeline(data);
		setCurrentList(value);
		setStatus("timeline");
	};

	const handleToggleList = () => {
		setStatus("select");
		setCursor(0);
		setFocus(0);
	};

	const handleUpdate = async (backward: boolean): Promise<Tweet[]> =>
		await getListTimeline(currentList.id_str, {
			backward,
			select: false,
		});

	return (
		<Box flexDirection="column" minHeight={rows}>
			<Text>{error}</Text>
			{status === "wait" && (
				<>
					<Text color="redBright">Open URL and enter PIN.</Text>
					<Text>
						{"https://api.twitter.com/oauth/authenticate?oauth_token=" + ot}
					</Text>
					<Box>
						<Text>PIN: </Text>
						<TextInput
							value={pin}
							onChange={setPIN}
							onSubmit={handleSubmitPinAuth}
						/>
					</Box>
				</>
			)}
			{status === "select" && (
				<>
					<Text>Select list to display.</Text>
					<SelectInput
						items={lists.map((l) => ({
							key: l.id_str,
							label: l.name + (l.mode === "private" ? " 🔒" : ""),
							value: l,
						}))}
						onSelect={handleSelect}
					/>
				</>
			)}
			{status === "timeline" && (
				<>
					<Box justifyContent="center" borderStyle="double" borderColor="gray">
						<Text>
							[LIST]<Text color="green">{currentList.name}</Text>({position}/
							{total})
						</Text>
					</Box>
					<Timeline onToggleList={handleToggleList} onUpdate={handleUpdate} />
				</>
			)}
		</Box>
	);
};

Tink.propTypes = {
	/// Name of the person to greet
	name: PropTypes.string,
};

export default Tink;
