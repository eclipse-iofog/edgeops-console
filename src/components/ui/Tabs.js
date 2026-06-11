import React from "react";
import PropTypes from "prop-types";
import { Tabs, Tab, Typography, Box } from "@mui/material";
import SearchBar from "./SearchBar";

function TabContainer(props) {
  return <Typography component="div">{props.children}</Typography>;
}

TabContainer.propTypes = {
  children: PropTypes.node.isRequired,
};

export default function SimpleTabs(props) {
  const [value, setValue] = React.useState(0);

  function handleChange(event, newValue) {
    setValue(newValue);
  }

  const children = props.children.filter((c) => !!c);
  const headerSx = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 15px 15px 0px",
  };
  const stickySx = props.stickyHeader
    ? {
        position: "sticky",
        top: 0,
        left: 0,
        width: "100%",
        backgroundColor: "white",
        zIndex: 2,
      }
    : {};

  return (
    <Box
      sx={{
        flexGrow: 1,
        backgroundColor: "background.paper",
        width: "max-content",
        minWidth: "100%",
        "& .MuiTabs-scroller": { paddingLeft: "15px" },
        "@media (min-width: 600px)": {
          "& .MuiTab-root": { minWidth: "unset" },
        },
        position: "relative",
      }}
    >
      {children.length === 1 ? (
        children
      ) : (
        <>
          <Box sx={{ ...headerSx, ...stickySx }}>
            <Tabs
              value={value}
              TabIndicatorProps={{ hidden: true }}
              onChange={handleChange}
              aria-labelledby={children.map((c, idx) => c.id || idx).join(" ")}
              style={{ flex: "2 1 0px", position: "sticky", left: 0 }}
              sx={{
                "& .MuiTab-root": {
                  fontSize: "17px",
                  fontWeight: "700",
                  color: "#10253dff",
                },
                "& .Mui-selected": {
                  opacity: 1,
                },
                "& .MuiTab-root:not(.Mui-selected)": {
                  opacity: 0.51,
                },
              }}
            >
              {children.map((child, idx) =>
                child ? (
                  <Tab
                    key={child.id || idx}
                    id={child.id || idx}
                    label={child.props.title}
                  />
                ) : null,
              )}
            </Tabs>
            {props.headers && props.headers(value)}
            {props.onSearch && (
              <SearchBar
                onSearch={props.onSearch}
                style={{ marginRight: "5px" }}
              />
            )}
          </Box>
          {props.children[value]}
        </>
      )}
    </Box>
  );
}
