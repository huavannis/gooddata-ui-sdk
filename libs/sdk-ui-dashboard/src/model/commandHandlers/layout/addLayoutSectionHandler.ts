// (C) 2021 GoodData Corporation

import { SagaIterator } from "redux-saga";
import { DashboardContext } from "../../types/commonTypes";
import { AddLayoutSection } from "../../commands";
import { invalidArgumentsProvided } from "../../events/general";
import { selectLayout, selectStash } from "../../store/layout/layoutSelectors";
import { call, put, SagaReturnType, select } from "redux-saga/effects";
import { ExtendedDashboardLayoutSection, InternalDashboardItemDefinition } from "../../types/layoutTypes";
import isEmpty from "lodash/isEmpty";
import { layoutActions } from "../../store/layout";
import { DashboardLayoutSectionAdded, layoutSectionAdded } from "../../events/layout";
import { validateSectionPlacement } from "./validation/layoutValidation";
import { ItemResolutionResult, validateAndResolveStashedItems } from "./validation/stashValidation";
import { resolveIndexOfNewItem } from "../../utils/arrayOps";
import { selectInsightsMap } from "../../store/insights/insightsSelectors";
import { batchActions } from "redux-batched-actions";
import { insightsActions } from "../../store/insights";
import {
    validateAndNormalizeWidgetItems,
    validateAndResolveItemFilterSettings,
} from "./validation/itemValidation";
import { addTemporaryIdentityToWidgets } from "../../utils/dashboardItemUtils";

type AddLayoutSectionContext = {
    readonly ctx: DashboardContext;
    readonly cmd: AddLayoutSection;
    readonly initialItems: InternalDashboardItemDefinition[];
    readonly layout: ReturnType<typeof selectLayout>;
    readonly stash: ReturnType<typeof selectStash>;
    readonly availableInsights: ReturnType<typeof selectInsightsMap>;
};

function validateAndResolveItems(commandCtx: AddLayoutSectionContext): ItemResolutionResult {
    const {
        ctx,
        layout,
        stash,
        initialItems,
        cmd: {
            payload: { index },
        },
    } = commandCtx;

    if (!validateSectionPlacement(layout, index)) {
        throw invalidArgumentsProvided(
            ctx,
            commandCtx.cmd,
            `Attempting to insert new section at wrong index ${index}. There are currently ${layout.sections.length} sections.`,
        );
    }

    const stashValidationResult = validateAndResolveStashedItems(stash, initialItems);

    if (!isEmpty(stashValidationResult.missing)) {
        throw invalidArgumentsProvided(
            ctx,
            commandCtx.cmd,
            `Attempting to use non-existing stashes. Identifiers of missing stashes: ${stashValidationResult.missing.join(
                ", ",
            )}`,
        );
    }

    return stashValidationResult;
}

export function* addLayoutSectionHandler(
    ctx: DashboardContext,
    cmd: AddLayoutSection,
): SagaIterator<DashboardLayoutSectionAdded> {
    const {
        payload: { initialItems = [] },
    } = cmd;
    const commandCtx: AddLayoutSectionContext = {
        ctx,
        cmd,
        initialItems: addTemporaryIdentityToWidgets(initialItems),
        layout: yield select(selectLayout),
        stash: yield select(selectStash),
        availableInsights: yield select(selectInsightsMap),
    };

    const stashValidationResult = validateAndResolveItems(commandCtx);
    const {
        payload: { index, initialHeader, autoResolveDateFilterDataset },
    } = cmd;

    const normalizationResult: SagaReturnType<typeof validateAndNormalizeWidgetItems> = yield call(
        validateAndNormalizeWidgetItems,
        ctx,
        stashValidationResult,
        cmd,
    );

    const itemsToAdd: SagaReturnType<typeof validateAndResolveItemFilterSettings> = yield call(
        validateAndResolveItemFilterSettings,
        ctx,
        cmd,
        normalizationResult,
        autoResolveDateFilterDataset,
    );

    const section: ExtendedDashboardLayoutSection = {
        type: "IDashboardLayoutSection",
        header: initialHeader,
        items: itemsToAdd,
    };

    yield put(
        batchActions([
            insightsActions.addInsights(normalizationResult.resolvedInsights.loaded),
            layoutActions.addSection({
                section,
                usedStashes: stashValidationResult.existing,
                index,
                undo: {
                    cmd,
                },
            }),
        ]),
    );

    return layoutSectionAdded(
        ctx,
        section,
        resolveIndexOfNewItem(commandCtx.layout.sections, index),
        cmd.correlationId,
    );
}
