import React from "react";
import { AuthContainer } from "../src/components/pages/AuthContainer";
import { ListSub } from "../src/components/templates/List";

/// List Command
const ListCommand = () => {
	return (
		<AuthContainer>
			<ListSub />
		</AuthContainer>
	);
};

export default ListCommand;
