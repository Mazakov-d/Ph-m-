import { useEffect, useRef } from "react";
import {
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  TextInput,
  type ViewStyle,
} from "react-native";
import { useKeyboard } from "../../hooks/useKeyboard";

// Room kept between the field being typed in and the keyboard.
const FIELD_MARGIN = 24;

type Props = Omit<ScrollViewProps, "contentContainerStyle"> & {
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * A page that scrolls above the keyboard: room under the content for the keyboard, and the field
 * being typed in scrolled just above it (so that one sees what one types). A press on a button
 * works while the keyboard is open.
 */
export function KeyboardAwareScrollView({ contentContainerStyle, children, ...props }: Props) {
  const keyboard = useKeyboard();
  const scrollView = useRef<ScrollView>(null);
  const offset = useRef(0);

  // Synchronises the scroll with the keyboard (a native system) once its room is laid out.
  useEffect(() => {
    if (keyboard.height === 0) return;
    const field = TextInput.State.currentlyFocusedInput();
    if (!field) return;
    field.measureInWindow((_x, y, _width, height) => {
      const hidden = y + height + FIELD_MARGIN - keyboard.top;
      if (hidden > 0) {
        scrollView.current?.scrollTo({ y: offset.current + hidden, animated: true });
      }
    });
  }, [keyboard]);

  return (
    <ScrollView
      ref={scrollView}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      {...props}
      onScroll={(event) => {
        offset.current = event.nativeEvent.contentOffset.y;
        props.onScroll?.(event);
      }}
      // While the keyboard is open, its height is added under the content.
      contentContainerStyle={[
        contentContainerStyle,
        keyboard.height > 0 ? { paddingBottom: keyboard.height } : null,
      ]}
    >
      {children}
    </ScrollView>
  );
}
