Vue.component('grounding-option', {
  template: `
    <span class='grounding-option'>
      <b>{{ term.entry_name }}</b> (score: {{ score.toFixed(2) }}, {{ term.status }} from {{ term.source }})
    </span>`,
  props: [
    'term',
    'score',
  ]
});


Vue.component('agent-select', {
  template: `
    <span class='agent-select'>
      <span v-if="!options || options_empty">
        <input v-model="agent_str" placeholder="Enter agent here">
        <button @click='lookupOptions'>Ground</button>
        <span v-show='searching'>Searching...</span>
        <span v-show='options_empty'>No groundings found...</span>
      </span>
      <span v-else-if="options.length == 1">
        <span class='frozen-box'>
          <grounding-option v-bind="options[0]"></grounding-option>
        </span>
        <button @click='resetOptions'>Cancel</button>
      </span>
      <span v-else>
        <select v-model='selected_option_idx'>
          <option :value='-1' selected disabled hidden>Select grounding option...</option>
          <option v-for='(option, option_idx) in options'
                  :key='option_idx'
                  :value='option_idx'>
            <grounding-option v-bind='option'></grounding-option>
          </option>
        </select>
        <button @click='resetOptions'>Cancel</button>
      </span>
    </span>`,
  props: ['value'],
  data: function() {
    return {
      agent_str: '',
      searching: false,
      options: null,
      selected_option_idx: -1, 
    }
  },
  methods: {
    lookupOptions: async function() {
      this.searching = true;
      const resp = await fetch(`${this.$ground_url}?agent=${this.agent_str}`, {method: 'GET'})
      this.options = await resp.json();
      this.searching = false;

      if (this.options.length == 1)
        this.selected_option_idx = 0;
    },
    resetOptions: function() {
      this.options = null;
      this.selected_option_idx = -1;
    }
  },
  computed: {
    options_empty: function() {
      if (!this.options)
        return false
      return this.options.length == 0
    }
  },
  watch: {
    selected_option_idx: function(selected_option_idx) {
      if (selected_option_idx < 0)
        this.$emit('input', null);
      else
        this.$emit('input', this.options[selected_option_idx]);
    }
  }
});

Vue.component('stmt-search', {
  template: `
    <div class='stmt_search'>
      <div id='seach-box' v-show='show_search'>
          <h3>Select Agents</h3>
          <div v-for="(agent, agent_idx) in agents"
               :key='agent_idx'>
            <button @click='removeAgent(agent_idx)'>x</button>
            <select v-model='agent.role'>
              <option v-for='role in role_options'
                      :key='role'
                      :value='role'>
                {{ role }}
              </option>
            </select>
            <agent-select v-model='agent.grounding'></agent-select>
          </div>
          <button @click='addAgent'>Add Agent</button>

          <h3>Select Type</h3>
          <input v-model='stmt_type'>

          <h3>Search</h3>
          <button @click='search'>Search</button>
      </div>
      <div v-show='!show_search'>
        <span id='search-reopen' @click='show_search=true'>Search...</span>
      </div>
      
      <div id='result-box' v-show='relations !== null'>
        <h3>Results</h3>
        <h2 v-show='empty_relations'>Nothing found.</h2>
        <div v-for='rel in relations' :key='rel.id'>
          <h2>{{ rel.english }}</h2>
        </div>
      </div>
    </div>`,
  data: function() {
    return {
      agents: [],
      stmt_type: null,
      role_options: [
        'subject',
        'object',
        'none',
      ],
      relations: null,
      show_search: true,
    }
  },
  methods: {
    addAgent: function() {
      this.agents.push({grounding: null, role: 'none'})
    },

    removeAgent: function(agent_idx) {
      const new_agents = [];
      this.agents.forEach( (entry, idx) => {
        if (idx == agent_idx)
          return;
        new_agents.push(entry);
      });
      this.agents = new_agents;
    },

    search: async function() {
      let query_str = '';

      // Format the agents into the query.
      let tagged_ag, term, role;
      for (let idx in this.agents) {
        window.console.log(idx)
        term = this.agents[idx].grounding.term;
        role = this.agents[idx].role
        if (idx != 0) {
          window.console.log(idx, idx != 0);
          query_str += '&'
        }
      
        tagged_ag = term.id + '@' + term.db;
        if (role === 'none')
          query_str += `agent${idx}=${tagged_ag}`;
        else
          query_str += `${role}=${tagged_ag}`;

        window.console.log(query_str)
      }

      // Format the statement type into the query.
      if (this.stmt_type !== null) {
        if (this.stmt_type.trim()) {
          if (query_str)
            query_str += '&'
          query_str += `stmt_type=${this.stmt_type}`
          window.console.log(query_str);
        }
      }

      // Make the query
      let url = `${this.$search_url}?limit=10&${query_str}`
      window.console.log(url);
      const resp = await fetch(url);
      this.relations = await resp.json();
      
      // Decide whether to close the search box or not.
      if (this.relations.length > 0)
        this.show_search = false

      return;
    }
  },
  computed: {
    empty_relations: function() {
      if (this.relations === null)
        return false
      if (this.relations.length === 0)
        return true
      return false
    }
  },
  created: function() {
    this.addAgent();
  }
});
