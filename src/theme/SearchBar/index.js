/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useRef, useCallback, useState, useEffect, version} from "react";
import classnames from "classnames";
import { useHistory, useLocation } from "@docusaurus/router";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useVersioning from "@theme/hooks/useVersioning";

const urlMatchesPrefix = (url, prefix) => {
  if (prefix.endsWith("/")) {
    throw new Error(`prefix must not end with a /.`);
  }
  return url === prefix || url.startsWith(`${prefix}/`);
};

const determineDocsVersionFromURL = (
  path,
  basePath,
  docsBaseRoutePath,
  versions
) => {
  // Array of versions that have route prefixes.
  // The latest version (version[0]) has no route prefix.
  const routeBasedVersions = ["next", ...versions.slice(1)];
  for (const version of routeBasedVersions) {
    if (urlMatchesPrefix(path, `${basePath}${docsBaseRoutePath}/${version}`)) {
      return version;
    }
  }
  return versions[0];
};

const Search = props => {
  const initialized = useRef(false);
  const searchBarRef = useRef(null);
  const history = useHistory();
  const { siteConfig = {} } = useDocusaurusContext();
  const { baseUrl } = siteConfig;
  const { versioningEnabled, versions, latestVersion } = useVersioning();
  const [versionToSearch, setVersionToSearch] = useState(latestVersion);
  const location = useLocation();

  // Update versionToSearch based on the URL
  useEffect(() => {
    if (!versioningEnabled) {
      return null;
    }
    // We cannot simply query for the meta tag that specifies the version,
    // because the tag is updated AFTER this effect runs and there is no
    // hook/callback available that runs after the meta tag changes.
    setVersionToSearch(determineDocsVersionFromURL(location.pathname, baseUrl, "docs", versions));
  }, [location, baseUrl, versions]);


  const initAlgolia = (searchDocs, searchIndex, DocSearch) => {
      new DocSearch({
        searchDocs,
        searchIndex,
        inputSelector: "#search_input_react",
        // Override algolia's default selection event, allowing us to do client-side
        // navigation and avoiding a full page refresh.
        handleSelected: (_input, _event, suggestion) => {
          const url = baseUrl + suggestion.url;
          // Use an anchor tag to parse the absolute url into a relative url
          // Alternatively, we can use new URL(suggestion.url) but its not supported in IE
          const a = document.createElement("a");
          a.href = url;
          // Algolia use closest parent element id #__docusaurus when a h1 page title does not have an id
          // So, we can safely remove it. See https://github.com/facebook/docusaurus/issues/1828 for more details.

          history.push(url);
        },
        versionsToSearch: versionToSearch ? [versionToSearch] : null,
      });
  };

  const getSearchDoc = () =>
    process.env.NODE_ENV === "production"
      ? fetch(`${baseUrl}search-doc.json`).then((content) => content.json())
      : Promise.resolve([]);

  const getLunrIndex = () =>
    process.env.NODE_ENV === "production"
      ? fetch(`${baseUrl}lunr-index.json`).then((content) => content.json())
      : Promise.resolve([]);

  const loadAlgolia = () => {
    if (!initialized.current) {
      Promise.all([
        getSearchDoc(),
        getLunrIndex(),
        import("./lib/DocSearch"),
        import("./algolia.css")
      ]).then(([searchDocs, searchIndex, { default: DocSearch }]) => {
        initAlgolia(searchDocs, searchIndex, DocSearch);
      });
      initialized.current = true;
    }
  };

  const toggleSearchIconClick = useCallback(
    e => {
      if (!searchBarRef.current.contains(e.target)) {
        searchBarRef.current.focus();
      }

      props.handleSearchBarToggle(!props.isSearchBarExpanded);
    },
    [props.isSearchBarExpanded]
  );

  return (
    <div className="navbar__search" key="search-box">
      <span
        aria-label="expand searchbar"
        role="button"
        className={classnames("search-icon", {
          "search-icon-hidden": props.isSearchBarExpanded
        })}
        onClick={toggleSearchIconClick}
        onKeyDown={toggleSearchIconClick}
        tabIndex={0}
      />
      <input
        id="search_input_react"
        type="search"
        placeholder="Search"
        aria-label="Search"
        className={classnames(
          "navbar__search-input",
          { "search-bar-expanded": props.isSearchBarExpanded },
          { "search-bar": !props.isSearchBarExpanded }
        )}
        onClick={loadAlgolia}
        onMouseOver={loadAlgolia}
        onFocus={toggleSearchIconClick}
        onBlur={toggleSearchIconClick}
        ref={searchBarRef}
      />
    </div>
  );
};

export default Search;
