import type { ComponentType } from 'react';

type SortableOptions = Record<string, unknown>;

export function sortableContainer<P extends object>(Component: ComponentType<P>, _options?: SortableOptions) {
  return function SortableContainer(props: P) {
    return <Component {...props} />;
  };
}

export function sortableElement<P extends object>(Component: ComponentType<P>, _options?: SortableOptions) {
  return function SortableElement(props: P) {
    return <Component {...props} />;
  };
}

export function sortableHandle<P extends object>(Component: ComponentType<P>, _options?: SortableOptions) {
  return function SortableHandle(props: P) {
    return <Component {...props} />;
  };
}

export function arrayMove<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const startIndex = fromIndex < 0 ? nextItems.length + fromIndex : fromIndex;

  if (startIndex >= 0 && startIndex < nextItems.length) {
    const [item] = nextItems.splice(startIndex, 1);
    const endIndex = toIndex < 0 ? nextItems.length + toIndex : toIndex;
    nextItems.splice(endIndex, 0, item);
  }

  return nextItems;
}

const reactSortableHocCompat = {
  arrayMove,
  sortableContainer,
  sortableElement,
  sortableHandle
};

export default reactSortableHocCompat;
