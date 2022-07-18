// (C) 2007-2022 GoodData Corporation
import React from "react";
import { ICatalogDateDataset, ObjRef, objRefToString } from "@gooddata/sdk-model";
import { defineMessages, useIntl } from "react-intl";
import cx from "classnames";
import {
    Dropdown,
    DropdownButton,
    DropdownList,
    sortDateDatasets,
    isDateDatasetHeader,
    IDateDataset,
    IAlignPoint,
    ShortenedText,
} from "@gooddata/sdk-ui-kit";
import { stringUtils } from "@gooddata/util";

const DEFAULT_HYPHEN_CHAR = "-";
const alignPoints: IAlignPoint[] = [{ align: "bl tl" }, { align: "tl bl" }];
const tooltipAlignPoints: IAlignPoint[] = [
    { align: "cl cr", offset: { x: -10, y: 0 } },
    { align: "cr cl", offset: { x: 10, y: 0 } },
];

interface IDateDatasetsListItemProps {
    id?: string;
    title?: string;
    isHeader?: boolean;
    isSelected?: boolean;
    isUnrelated?: boolean;
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

// work around the evil DateDatasetsListItem from kit that magically translates SOME of the items' titles
// this way the i18n actually has a chance to detect these
const dateDatasetHeaderMessages = defineMessages({
    "gs.date.date-dataset.recommended": { id: "gs.date.date-dataset.recommended" },
    "gs.date.date-dataset.other": { id: "gs.date.date-dataset.other" },
    "gs.date.date-dataset.related": { id: "gs.date.date-dataset.related" },
    "gs.date.date-dataset.unrelated": { id: "gs.date.date-dataset.unrelated" },
});

const DateDatasetsListItem: React.FC<IDateDatasetsListItemProps> = ({
    id,
    title = "",
    isHeader,
    isSelected,
    isUnrelated,
    onClick,
}) => {
    if (isHeader) {
        return <div className="gd-list-item gd-list-item-header">{title}</div>;
    }

    const classNames = cx(
        "gd-list-item",
        "gd-list-item-shortened",
        `s-${id}`,
        `s-${stringUtils.simplifyText(title)}`,
        {
            "is-selected": isSelected,
            "is-unrelated": isUnrelated,
        },
    );

    return (
        <div className={classNames} onClick={onClick}>
            <ShortenedText tooltipAlignPoints={tooltipAlignPoints}>{title}</ShortenedText>
        </div>
    );
};

export interface IDateDatasetDropdownProps {
    autoOpen?: boolean;
    autoOpenChanged: (widgetRef: ObjRef, autoOpen: boolean) => void;
    widgetRef: ObjRef;
    relatedDateDatasets: ICatalogDateDataset[];
    activeDateDataset?: ICatalogDateDataset;
    unrelatedDateDataset?: ICatalogDateDataset;
    dateFromVisualization?: ICatalogDateDataset;
    onDateDatasetChange: (id: string) => void;
    className?: string;
    width: number;
    isLoading?: boolean;
}

function catalogDateDatasetToDateDataset(ds: ICatalogDateDataset): IDateDataset {
    return {
        id: ds.dataSet.id,
        title: ds.dataSet.title,
        relevance: ds.relevance,
    };
}

function removeDateFromTitle(title: string) {
    return title.trim().replace(/^Date \((.*)\)$/, "$1");
}

export const DateDatasetDropdown: React.FC<IDateDatasetDropdownProps> = (props) => {
    const {
        className = "s-date-dataset-switch",
        isLoading = false,
        autoOpen = false,
        onDateDatasetChange,
        autoOpenChanged,
        activeDateDataset,
        unrelatedDateDataset,
        width,
        dateFromVisualization,
        relatedDateDatasets,
        widgetRef,
    } = props;

    const intl = useIntl();

    const unrelatedDateDataSetId = unrelatedDateDataset ? unrelatedDateDataset.dataSet.id : null;
    let activeDateDataSetId: string;
    let activeDateDataSetTitle = DEFAULT_HYPHEN_CHAR;
    let activeDateDataSetUri: string;
    let recommendedDateDataSet = null;

    if (!isLoading && activeDateDataset) {
        activeDateDataSetId = activeDateDataset.dataSet.id;
        activeDateDataSetTitle = activeDateDataset.dataSet.title;
        activeDateDataSetUri = activeDateDataset.dataSet.uri;
    }

    if (dateFromVisualization) {
        recommendedDateDataSet = relatedDateDatasets.find(
            (d) => d.dataSet.uri === dateFromVisualization.dataSet.uri,
        );
    }

    const sortedItems = sortDateDatasets(
        relatedDateDatasets.map(catalogDateDatasetToDateDataset),
        recommendedDateDataSet ? catalogDateDatasetToDateDataset(recommendedDateDataSet) : undefined,
        unrelatedDateDataset ? catalogDateDatasetToDateDataset(unrelatedDateDataset) : undefined,
    );

    return (
        <Dropdown
            // We want to open the dropdown, when user selects a metric
            // without a recommended data set
            key={`${objRefToString(widgetRef)}_${autoOpen}`}
            openOnInit={autoOpen}
            ignoreClicksOnByClass={[".dash-content"]}
            renderButton={({ isOpen, toggleDropdown }) => {
                const buttonClassName = cx("s-date-dataset-button", isOpen ? "s-expanded" : "s-collapsed", {
                    "is-loading": isLoading,
                    "is-unrelated":
                        !isLoading &&
                        unrelatedDateDataset &&
                        unrelatedDateDataset.dataSet.uri === activeDateDataSetUri,
                });

                const buttonValue = isLoading
                    ? intl.formatMessage({ id: "loading" })
                    : removeDateFromTitle(activeDateDataSetTitle);

                return (
                    <DropdownButton
                        className={buttonClassName}
                        value={buttonValue}
                        isOpen={isOpen}
                        onClick={toggleDropdown}
                        disabled={isLoading}
                    />
                );
            }}
            className={className}
            closeOnParentScroll
            closeOnMouseDrag
            alignPoints={alignPoints}
            renderBody={({ closeDropdown }) => {
                if (isLoading) {
                    return null;
                }

                return (
                    <DropdownList
                        className="configuration-dropdown dataSets-list"
                        width={width}
                        items={sortedItems}
                        itemsCount={sortedItems.length}
                        renderItem={({ item }) => {
                            const isHeader = isDateDatasetHeader(item);
                            const isSelected = !isDateDatasetHeader(item) && activeDateDataSetId === item.id;
                            const isUnrelated =
                                !isDateDatasetHeader(item) && unrelatedDateDataSetId === item.id;
                            return (
                                <DateDatasetsListItem
                                    title={
                                        isHeader
                                            ? intl.formatMessage(dateDatasetHeaderMessages[item.title])
                                            : removeDateFromTitle(item.title)
                                    }
                                    isHeader={isHeader}
                                    isSelected={isSelected}
                                    isUnrelated={isUnrelated}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (isDateDatasetHeader(item)) {
                                            return;
                                        }
                                        closeDropdown();
                                        autoOpenChanged(widgetRef, false);
                                        onDateDatasetChange(item.id);
                                    }}
                                />
                            );
                        }}
                    />
                );
            }}
        />
    );
};