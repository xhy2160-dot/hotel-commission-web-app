
<template>
  <button @click="isDark = !isDark">Toggle Theme</button>
  <button @click="showPopup = true">+ Add event</button>
  <SimpleCalendarJsVue
      :defaultView="'week'"
      :defaultDate="new Date()"
      :weekStartsOn="1"
      ref="calendarRef"
      :darkMode="isDark"
      :fetchEvents="fetchEvents"
      @eventClick="handleEventClick"
      @slotClick="(date) => console.log('Slot clicked:', date)"
      @viewChange="(view) => console.log('View changed:', view)"
      :style="{ height: '600px' }"
      :showGridLines="true"
      class="uc-calendar"
  />
</template>

<script setup>
import { ref } from 'vue'
import SimpleCalendarJs from 'simple-calendar-js'
window.SimpleCalendarJs = SimpleCalendarJs
import SimpleCalendarJsVue from 'simple-calendar-js/frameworks/simple-calendar-js-vue.js'
import 'simple-calendar-js/dist/simple-calendar-js.min.css'
import Addeventpopup from "@/components/Addeventpopup.vue";

const isDark = ref(true)
const showPopup = ref(false)

const clickedDate = ref(null)
const calendarRef = ref()


const events = ref([
  {
    id: '1',
    title: 'Existing Event',
    tooltip:'hello',
    start: new Date(2026, 5, 30, 10, 0),
    end: new Date(2026, 5, 30, 11, 0),
  },
  {
    id: '2',
    title: 'Existing Event2',
    start: new Date(2026, 5, 30, 10, 0),
    end: new Date(2026, 5, 30, 11, 0),
  },
  {
    id: '3',
    title: 'Existing Event',
    start: new Date(2026, 5, 30, 10, 0),
    end: new Date(2026, 5, 30, 11, 0),
  },
  {
    id: '4',
    title: 'Existing Event2',
    start: new Date(2026, 5, 30, 10, 0),
    end: new Date(2026, 5, 30, 11, 0),
  }
])



// fetchEvents just returns whatever is in your local array
const fetchEvents = async (start, end) => {
  return events.value.filter(e => e.end >= start && e.start <= end)
}

// To add an event: push to the array, then refresh
const addEvent = (newEvent) => {
  events.value.push(newEvent)
  calendarRef.value.refresh()
}

const handleEventClick = (event) => {
  console.log(event)
}

// Example: add on slot click
const handleSlotClick = (date) => {
  addEvent({
    id: Date.now().toString(),
    title: 'New Event',
    start: date,
    end: new Date(date.getTime() + 60 * 60 * 1000), // +1 hour
    color: '#4f46e5'
  })
}
</script>
<style scoped>
.uc-calendar {
  /* Primary color */
  --cal-primary: #10b981;           /* Green theme */
  --cal-primary-dark: #059669;
  --cal-primary-light: #d1fae5;

  /* Today indicator */
  --cal-today-bg: #d1fae5;
  --cal-today-text: #059669;
}
</style>